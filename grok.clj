(ns backend.public
  (:gen-class)
  (:require
   ;; ---- RAMA ----
   [com.rpl.rama :refer :all]
   [com.rpl.rama.path :refer :all]
   [com.rpl.rama.ops :as ops]
   [com.rpl.rama.aggs :as aggs]
   [com.rpl.rama.test :as rtest]

   [clojure.edn :as edn]

   ;; ---- MISC ----- 
   [ring.adapter.jetty :as jetty]
   [ring.util.response :as response]
   [clojure.java.io :as io]
   [reitit.ring :as ring]
   [clojure.string :as str]
   [clj-http.client :as http]
   [cheshire.core :as json])
  (:import [java.util.concurrent CompletableFuture]
           [org.apache.pdfbox.pdmodel PDDocument]
           [org.apache.pdfbox.text PDFTextStripper]
           [org.apache.pdfbox Loader]))


;; ============================================================================
;; BETTER EU - A REVIEW OF THE ENTIRE CORPUS OF EU REGULATIONS
;; ============================================================================
;;
;; A live review system that processes all EU regulations from 1958-2025 using
;; Grok 4.1 to determine which regulations should be kept or deleted
;;
;; ARCHITECTURE:
;; - Clojure as primary programming language
;; - Rama for distributed, scalable, and fault tolerant data storage and compute
;; - XAI's Grok 4.1 API for regulation analysis and verdict generation
;; - EUR-Lex SPARQL endpoint for fetching regulation data
;; - Ring/Reitit web server
;;
;; WORKFLOW:
;; 1. Ingest celex ID for every regulation in each year from 1958 to 2025 and store
;; 2. Ingest a regulation document for every celex ID and store in a queue
;; 3. Kick off review loop to review every document in queue until complete
;;
;; TABLE OF CONTENTS:
;; 1. EUR-LEX DATA FETCHING           - SPARQL queries for regulation metadata
;; 2. AI PROCESSING & VERDICTS        - Grok API integration and prompt engineering
;; 3. RAMA MODULE                     - Stream topology, depots, pstates, queries
;; 4. RAMA CLIENT SETUP               - Manager initialization and resource binding
;; 5. EVENT HANDLING & QUERIES        - Multimethod dispatch to provide UI with data
;; 6. ROUTER                          - Ring/Reitit HTTP routing
;; 7. SERVER                          - Jetty server
;;
;; ============================================================================

(def system (atom {:depot {} :pstate {} :query {} :server nil}))

(defn xai-api-key []
  (or (System/getenv "XAI_API_KEY")
      (throw (ex-info "XAI_API_KEY not set" {}))))

;; ============================================================================
;; EUR-LEX DATA FETCHING
;; ============================================================================
;; This section handles fetching EU regulation data from the EUR-Lex SPARQL endpoint
;; and extracting text content from PDF documents. It provides functionality to
;; retrieve regulation documents in multiple languages with fallback mechanisms.
;;
;; Table of Contents:
;; - cellar-lang-priority  : Language preference order for document retrieval
;; - pdf-bytes->text       : Extracts text content from PDF byte arrays
;; - fetch-pdf!            : Async function to fetch and process regulation PDFs


(def cellar-lang-priority
  "EU languages ordered by likelihood of having regulation text"
  ["en" "fr" "de" "it" "nl" "es" "pt" "pl" "ro" "da" "sv" "fi"
   "el" "cs" "sk" "hu" "sl" "lt" "lv" "et" "mt" "bg" "hr" "ga"])

(defn pdf-bytes->text
  "Extracts text from PDF byte array using PDFBox."
  [^bytes pdf-bytes]
  (with-open [doc (Loader/loadPDF pdf-bytes)]
    (let [stripper (PDFTextStripper.)]
      (.getText stripper doc))))

(defn fetch-pdf!
  [celex]
  (CompletableFuture/supplyAsync
   (fn []
     (let [url (str "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:" celex)]
       (loop [langs cellar-lang-priority]
         (if (empty? langs)
           {:url url :text nil :error "No PDF available in any language" :waf-blocked false}
           (let [lang (first langs)
                 lang-upper (str/upper-case lang)
                 pdf-url (str "https://eur-lex.europa.eu/legal-content/" lang-upper "/TXT/PDF/?uri=CELEX:" celex)
                 result (try
                          (let [response (http/get pdf-url
                                                   {:socket-timeout 20000
                                                    :connection-timeout 10000
                                                    :follow-redirects true
                                                    :throw-exceptions false
                                                    :as :byte-array})
                                status (:status response)]
                            (cond
                              (= 202 status)
                              {:url url :text nil :error nil :waf-blocked true}

                              (and (= 200 status)
                                   (some? (:body response))
                                   (> (count (:body response)) 500))
                              (let [text (pdf-bytes->text (:body response))]
                                (if (and text (> (count text) 50))
                                  {:url pdf-url :text (subs text 0 (min (count text) 30000)) :error nil :waf-blocked false}
                                  ::try-next))

                              :else ::try-next))
                          (catch Exception e
                            {:url url :text nil :error (.getMessage e) :waf-blocked false}))]
             (if (= ::try-next result)
               (recur (rest langs))
               result))))))))



;; ============================================================================
;; AI PROCESSING & VERDICT GENERATION
;; ============================================================================

;; This section handles the integration with the Grok AI API to generate verdicts
;; on EU regulations. It includes prompt engineering, API communication, and
;; response parsing to extract structured verdict data.
;;
;; Table of Contents:
;; - PROMPT                     : The system prompt for AI verdict generation
;; - extract-map-from-response  : Parses EDN maps from AI responses
;; - call-grok                  : Makes API call to Grok 4.1
;; - call-grok!                 : Async wrapper invoked by Rama module to kick of processing


(def PROMPT
  "You are the head of Better EU, a fictional agency who's members are all trained on the works of Ludwig Von Mises, Hayek, and Milton Friedman, and are tasked with the ambitious objective of reviewing all of the EU's current regulations with the goal of assessing which should be deleted in their entirety. \n\nYour moral thrust is to get the European continent back onto the world stage in terms of wealth, prosperity, individualism, liberty, and greatness. You recognise, as those aforementioned economists did, that:

   * Wealth is created not by decree but by liberty and private property
   \n
   * That the rhetoric of politicians rarely, if ever, translates into effective action at improving the lot of the poor, so should always be treated as suspect and not taken at face value
   \n
   * That institutions matter more than desired outcomes. One cannot wish things into existence or declare that things will be so. The institutions for creating those outcomes have to be in place and always have a life of their own. For instance, 'tax the rich to help the poor' is an outcome many people ask for without specifying the institutions that will ensure that A - the rich won't just leave and B - that the poor will actually receive the benefits
   \n
   * That regulations, as an institution, are set up to achieve one thing but always have unintended consequences, such as distorting incentives, reducing supply, increasing costs, creating monopolies, and sometimes hurting people directly by withholding better options, and that the desired goal of a regulation *must* be weighed against the unintended costs.
   \n

You will be given one EU regulation at a time and are to return a clojure map with these fields: \n {:summary 'summary-of-regulation', :verdict 'keep/delete', :reason 'reason for verdict'}. 
   \n
   If your verdict is 'keep', your reason must be succinct and address the question of: why would European citizens be worse off if this regulation was deleted, and why you think that this regulation must therefore be achieving its desired outcome in a way that would not happen without it. 
   \n
   If your verdict is 'delete', your reason must be succinct and address the costs of keeping this regulation on the books, accounting for the nonobvious unseen consequences.

Regulation: ")

(defn extract-map-from-response
  "Attempts to parse an EDN map from a string. 
   Handles clean EDN, Markdown code blocks, and conversational preambles."
  [content]
  (try
    (clojure.edn/read-string content)
    (catch Exception _
      ;; If direct parsing fails, try to find the map substring
      (if-let [start-idx (str/index-of content "{")]
        (if-let [end-idx (str/last-index-of content "}")]
          (let [candidate (subs content start-idx (inc end-idx))]
            (try
              (clojure.edn/read-string candidate)
              (catch Exception e
                (println "Failed to parse extracted substring:" (.getMessage e))
                nil)))
          (do (println "No closing brace found.") nil))
        (do (println "No opening brace found.") nil)))))

(defn call-grok
  "Calls the Grok API with a message and returns the response"
  [text]
  (let [api-url "https://api.x.ai/v1/chat/completions"
        headers {"Content-Type" "application/json"
                 "Authorization" (str "Bearer " (xai-api-key))}
        payload {:messages [{:role "user"
                             :content (str PROMPT text)}]
                 :model "grok-4-1-fast-non-reasoning"
                 :stream false
                 :temperature 0.7}]
    (try
      (let [response (http/post api-url
                                {:headers headers
                                 :socket-timeout 30000
                                 :connection-timeout 10000
                                 :body (json/generate-string payload)
                                 :as :json})
            ticks   (get-in response [:body :usage :cost_in_usd_ticks])
            content (get-in response [:body :choices 0 :message :content])
            extract (extract-map-from-response content)
            return  (assoc extract :cost-in-ticks (long (or ticks 0)))]
        return)
      (catch Exception e
        {:error (.getMessage e)}))))

(defn call-grok! [text]
  (CompletableFuture/supplyAsync
   (fn []
     (let [result (call-grok text)]
       (if (:error result)
         {:error (:error result)}
         result)))))



;; ============================================================================
;; RAMA MODULE
;; ============================================================================

;; Implements the main Rama module for data computation and storage
;;
;; Table of Contents:
;; - MAX-YEAR           : Global var defining completion year
;; - timeout-ms         : Calculates timeout duration based on error count
;; - total-regulations  : Calculates total regulations from map minus blocked counts
;; - total-regs-integer : Calculates total regulations from set minus blocked counts
;; - MainModule         : Rama module where all processing executes and data is stored


(def MAX-YEAR 2025)

(defn timeout-ms [num-errors]
  (let [now (System/currentTimeMillis)]
    (case num-errors
      1 (+ now 5000)
      2 (+ now 30000)
      3 (+ now 120000)
      4 (+ now 300000) ; 5 mins
      5 (+ now 600000) ; 10 mins
      0)))

(defn total-regulations [m ib rb]
  (let [t (or (:total m) 0)
        ib-count (if ib (count ib) 0)
        rb-count (if rb (count rb) 0)
        total (- t ib-count rb-count)]
    (merge m {:total total})))

(defn total-regs-integer [s ib rb]
  (let [set-count (count s)
        ib-count (if ib (count ib) 0)
        rb-count (if rb (count rb) 0)
        total (- set-count ib-count rb-count)]
    (long total)))

(defmodule MainModule [setup topologies]
  (declare-depot setup *ingest-celex-depot       (hash-by :year))
  (declare-depot setup *ingest-regulations-depot (hash-by :year))
  (declare-depot setup *year-stats-depot         (hash-by :year))
  (declare-depot setup *master-switch-depot      :random {:global? true})
  (declare-tick-depot setup *tick 1000)

  (let [ig (stream-topology topologies "ingest")
        s (stream-topology topologies "core")]

    (declare-pstate ig $$celex
                    {Long (set-schema String)})

    (declare-pstate ig $$ingest-queue
                    {Long (vector-schema String)})

    (declare-pstate ig $$ingest-current-year
                    Long {:global? true :initial-value 1958})

    (declare-pstate ig $$regulations
                    {Long
                     {String
                      (fixed-keys-schema {:celex    String
                                          :url      String
                                          :year     Long
                                          :text     String})}})

    (declare-pstate ig $$ingest-processing?
                    Boolean {:global? true :initial-value false})

    (declare-pstate ig $$waf-errors
                    Long  {:global? true :initial-value 0})

    (declare-pstate ig $$timeout
                    Long
                    {:global? true :initial-value 0})

    (declare-pstate ig $$ingest-retries
                    {String Long})

    (declare-pstate ig $$ingest-abandoned
                    (fixed-keys-schema
                     {:abandoned (set-schema String)}) {:global? true})





    ; deprecate
    (declare-pstate s $$regulations-by-year
                    {Long ; year
                     {String ; celex
                      (fixed-keys-schema {:celex    String
                                          :url      String
                                          :year     Long
                                          :text     String})}})

    (declare-pstate s $$review-queue
                    {Long (vector-schema String)})


    (declare-pstate s $$reviews-by-year
                    {Long ; year
                     {String ; celex
                      (fixed-keys-schema
                       {:summary String
                        :verdict String
                        :reason  String
                        :url     String
                        :celex   String
                        :error   String})}})

    (declare-pstate s $$verdicts
                    (fixed-keys-schema
                     {:keeps             Long
                      :deletes           Long
                      :errors            Long
                      :total-reviews     Long
                      :total-regulations Long
                      :cost-in-ticks     Long}) {:global? true})

    (declare-pstate s $$current-year
                    Long {:global? true
                          :initial-value 1958})

    (declare-pstate s $$processing?
                    Boolean {:global? true
                             :initial-value false})

    (declare-pstate s $$processing-since Long {:global? true :initial-value 0})


    (declare-pstate s $$year-stats
                    {Long  ;; year                                                                                                                                                                     
                     (fixed-keys-schema
                      {:year     Long
                       :total    Long    ;; regulations found for this year
                       :reviewed Long})} ;; reviews completed for this year 
                    )

    (declare-pstate s $$master-switch
                    Boolean {:global? true :initial-value false})


    (declare-pstate s $$retries
                    {String Long})

    (declare-pstate ig $$review-abandoned
                    (fixed-keys-schema
                     {:abandoned (set-schema String)}) {:global? true})

    ;; ---- Sources ----


    (<<sources ig

               (source> *tick)
               (|global)

               (local-select> STAY $$master-switch :> *master-switch)
               (filter> *master-switch)

               (local-select> STAY $$ingest-processing? :> *processing?)
               (filter> (not *processing?))

               ; lock processing
               (local-transform> (termval true) $$ingest-processing?)

               ; get timeout check
               (local-select> STAY $$waf-errors :> *num-errors)
               (local-select> STAY $$timeout :> *timeout)

               ; pass if we've past timeout 
               (filter> (> (System/currentTimeMillis) *timeout))

               ; get current year
               (local-select> STAY $$ingest-current-year :> *year)
               ; get queue
               (|hash *year)
               (local-select> [(keypath *year)] $$ingest-queue :> *queue)
               (first *queue :> *celex)

               ; fetch PDF
               (completable-future> (fetch-pdf! *celex) :> {:keys [*url *text *error *waf-blocked]})
               (prn {:waf-blocked *waf-blocked})
               (<<cond
                ;; === success path ===
                (case> *text)

                 ; add to review queue
                (depot-partition-append! *ingest-regulations-depot {:year *year
                                                                    :celex *celex
                                                                    :url *url
                                                                    :text *text}
                                         :append-ack)

                ; remove from queue 
                (local-transform> [(keypath *year) FIRST NONE>] $$ingest-queue)

                ; set num errors to 0
                (|global)
                (local-transform> (termval 0) $$timeout)

                ; if no queue left but years left, start next year
                (<<if (and> (nil? (second *queue))
                            (< *year MAX-YEAR))
                      (local-transform> (term inc) $$ingest-current-year))

                ; release processing
                (local-transform> (termval false) $$ingest-processing?)




                ;; === WAF error path ===
                (case> *waf-blocked)
                (<<if
                 ; if less than 5 attempts
                 (<= *num-errors 5)
                 ; add timeout and error num
                 (|global)
                 (local-transform> (term inc) $$waf-errors)
                 (timeout-ms *num-errors :> *ms)
                 (local-transform> (termval *ms) $$timeout)
                 ; release processing (won't process next till after timeout, retries same celex) 
                 (local-transform> (termval false) $$ingest-processing?)


                 ; else
                 (else>)
                 ; too many waf errors, release processing
                 (|global)
                 (local-transform> (termval false) $$ingest-processing?)
                 ; halt op
                 (depot-partition-append! *master-switch-depot false :append-ack))


                ;; === no text ===
                (case> (and> (nil? *text) (nil? *error)))
                ; remove from queue
                (|hash *year)
                (local-transform> [(keypath *year) FIRST NONE>] $$ingest-queue)
                ; remove from celex
                (+compound $$celex {*year (aggs/+set-remove-agg *celex)})
                ; set num errors to 0
                (|global)
                (local-transform> (termval 0) $$waf-errors)
                ; if no queue left but years left, start next year
                (<<if (and> (nil? (second *queue))
                            (< *year MAX-YEAR))
                      (local-transform> (term inc) $$ingest-current-year))
                ; release processing 
                (local-transform> (termval false) $$ingest-processing?)



                ;; === other error ===
                (case> *error)
                ; get retries
                (|hash *celex)
                (local-select> (keypath *celex) $$ingest-retries :> *retries)
                (<<if (<= (or> *retries 0) 3)
                      ; add celex to back of queue
                      (|hash *year)
                      (local-transform> [(keypath *year) FIRST NONE>] $$ingest-queue)
                      (local-transform> [(keypath *year) AFTER-ELEM (termval *celex)] $$ingest-queue)
                      ; log retry attempt
                      (+compound $$ingest-retries {*celex (aggs/+sum 1)})
                      ; release processing
                      (|global)
                      (local-transform> (termval false) $$ingest-processing?)

                      (else>)
                      ; remove from queue
                      (|hash *year)
                      (local-transform> [(keypath *year) FIRST NONE>] $$ingest-queue)
                      ; remove from celex 
                      (+compound $$celex {*year (aggs/+set-remove-agg *celex)})
                      ; if no queue left but years left, start next year
                      (|global)
                      (<<if (and> (nil? (second *queue))
                                  (< *year MAX-YEAR))
                            (local-transform> (term inc) $$ingest-current-year))
                       ; release processing 
                      (local-transform> (termval false) $$ingest-processing?))

                (default>)

                ; release processing 
                (|global)
                (local-transform> (termval false) $$ingest-processing?)
                ; halt op
                (depot-partition-append! *master-switch-depot false :append-ack))


               (source> *ingest-celex-depot :> {:keys [*year *set]})
               (local-transform> [(keypath *year)
                                  (termval *set)] $$celex)
               (vec *set :> *vec)
               (local-transform> [(keypath *year)
                                  (termval *vec)] $$ingest-queue)

               (long (count *set) :> *count)
               (depot-partition-append! *year-stats-depot {:year *year :count *count} :append-ack))


    (<<sources s

               (source> *year-stats-depot :> {:keys [*year *count]})
               (+compound $$year-stats {*year {:year (aggs/+last *year)
                                               :total (aggs/+last *count)}})

               (source> *tick)
               (|global)
               (local-select> STAY $$master-switch :> *master-switch)
               (filter> *master-switch)

               (local-select> STAY $$processing? :> *currently-processing)
               (local-select> STAY $$processing-since :> *since)

               (<<cond
                (case> (and> *currently-processing (> (- (System/currentTimeMillis) *since) 60000)))
                (|global)
                (local-transform> (termval false) $$processing?)
                (local-transform> (termval 0) $$processing-since)
                (default>)
                nil)

               (local-select> STAY $$processing? :> *processing?)
               (filter> (not *processing?))

               (|global)
               (local-transform> (termval true) $$processing?)
               (local-transform> (termval (System/currentTimeMillis)) $$processing-since)

               (local-select> STAY $$current-year :> *year)
               (local-select> STAY $$ingest-current-year :> *ingest-year)

               (|hash *year)
               (local-select> (keypath *year) $$review-queue :> *queue)
               (first *queue :> *celex)
               (|hash *celex)
               (local-select> (keypath *celex) $$retries :> *retries)

               (<<cond
                (case> *celex)
                (|hash *year)
                (local-select> (keypath *year *celex) $$regulations-by-year :> {:keys [*url *text]})
                (completable-future> (call-grok! *text) :> {:keys [*summary *verdict *reason *cost-in-ticks *error]})
                (<<if *error
                      (<<if (> (or> *retries 0) 3)
                            ; delete from queue permanently
                            (local-transform> [(keypath *year) FIRST NONE>] $$review-queue)
                            (|global)
                             ; add to total-reviewed
                            (+compound $$verdicts {:total-reviews (aggs/+sum 1)
                                                   :cost-in-ticks (aggs/+sum *cost-in-ticks)})
                             ; stop processing celex
                            (local-transform> (termval false) $$processing?)
                            (else>)
                             ; remove from front of queue
                            (local-transform> [(keypath *year) FIRST NONE>] $$review-queue)
                            ; add to back of queue
                            (local-transform> [(keypath *year) AFTER-ELEM (termval *celex)] $$review-queue)
                            ; add to retry count
                            (|hash *celex)
                            (+compound $$retries {*celex (aggs/+sum 1)})
                            ; stop processing celex
                            (|global)
                            (local-transform> (termval false) $$processing?))

                      (else>)
                      (|hash *year)
                      (local-transform> [(keypath *year *celex)
                                         (termval {:summary *summary
                                                   :verdict *verdict
                                                   :reason *reason
                                                   :url *url
                                                   :celex *celex})] $$reviews-by-year)
                      (|global)
                      (<<cond
                       (case> (= *verdict "keep"))
                       (+compound $$verdicts {:keeps         (aggs/+sum 1)
                                              :total-reviews (aggs/+sum 1)
                                              :cost-in-ticks (aggs/+sum *cost-in-ticks)})

                       (case> (= *verdict "delete"))
                       (+compound $$verdicts {:deletes       (aggs/+sum 1)
                                              :total-reviews (aggs/+sum 1)
                                              :cost-in-ticks (aggs/+sum *cost-in-ticks)})

                       (default>)
                       (+compound $$verdicts {:errors        (aggs/+sum 1)
                                              :total-reviews (aggs/+sum 1)
                                              :cost-in-ticks (aggs/+sum *cost-in-ticks)}))

                      (|hash *year)
                      (+compound $$year-stats {*year {:reviewed (aggs/+sum 1)
                                                      :year     (aggs/+last *year)}})
                      (local-transform> [(keypath *year) FIRST NONE>] $$review-queue)
                      (|global)
                      (local-transform> (termval false) $$processing?))


                (case> (and> (nil? *celex) (<= *year MAX-YEAR) (< *year *ingest-year)))
                (|global)
                (local-transform> (term inc) $$current-year)
                (local-transform> (termval false) $$processing?)

                (default>)
                (local-transform> (termval false) $$processing?))

               (source> *ingest-regulations-depot :> {:keys [*year *celex *url *text]})
               (local-transform> [(keypath *year) NIL->VECTOR  AFTER-ELEM (termval *celex)]
                                 $$review-queue)
               (local-transform> [(keypath *year *celex)
                                  (termval {:url *url
                                            :text *text
                                            :year *year
                                            :celex *celex})] $$regulations-by-year)

               (source> *master-switch-depot :> *bool)
               (local-transform> (termval *bool) $$master-switch))


    (<<query-topology topologies "chart-query" [:> *res]
                      (|global)
                      (local-select> STAY $$current-year :> *year)
                      (local-select> STAY $$master-switch :> *active)
                      (local-select> (keypath :abandoned) $$ingest-abandoned :> *ib)
                      (local-select> (keypath :abandoned) $$review-abandoned :> *rb)
                      (|all)
                      (local-select> [MAP-VALS (view total-regulations *ib *rb)] $$year-stats :> *chart-query)
                      (|origin)
                      (+compound {:current-year (aggs/+last *year)
                                  :active (aggs/+last *active)
                                  :years (aggs/+vec-agg *chart-query)} :> *res))

    (<<query-topology topologies "verdict" [:> *res]
                      (|global)
                      (local-select> :keeps $$verdicts :> *keeps)
                      (local-select> :deletes $$verdicts :> *deletes)

                      (local-select> (keypath :abandoned) $$ingest-abandoned :> *ib)
                      (local-select> (keypath :abandoned) $$review-abandoned :> *rb)
                      (local-select> :total-reviews $$verdicts :> *total-reviews)
                      (local-select> :cost-in-ticks $$verdicts :> *cost)
                      (|all)
                      (local-select> [MAP-VALS (view total-regs-integer *ib *rb)] $$celex :> *total-regulations)
                      (|origin)
                      (+compound {:keeps (aggs/+last *keeps)
                                  :deletes (aggs/+last *deletes)
                                  :total-regulations (aggs/+sum *total-regulations)
                                  :total-reviews (aggs/+last *total-reviews)
                                  :cost-in-ticks (aggs/+last *cost)}
                                 :> *res))

    (<<query-topology topologies "table-reviews-query" [*year :> *res]
                      (|hash *year)
                      (local-select> [(keypath *year) MAP-VALS] $$reviews-by-year :> *review)
                      (|origin)
                      (aggs/+vec-agg *review :> *res))))


;; ============================================================================
;; RAMA CLIENT SETUP
;; ============================================================================

;; Implements the Rama client setup for connecting to and interacting with
;; the MainModule's resources (depots, pstates, and query topologies)
;;
;; Table of Contents:
;; - rama-manager               : Atom holding the Rama manager instance
;; - get-depot                  : Gets a Rama depot client by key
;; - get-pstate                 : Gets a Rama pstate client by key
;; - get-query                  : Gets a Rama query topology client by key
;; - key->depot-name            : Converts key to depot name format (*key)
;; - key->pstate-name           : Converts key to pstate name format ($$key)
;; - key->query-name            : Converts key to query name format (key)
;; - init-depots!               : Initializes depot clients from manager
;; - init-pstates!              : Initializes pstate clients from manager
;; - init-queries!              : Initializes query topology clients from manager
;; - rama-config                : Configuration map for Rama resources
;; - init-rama-resources!       : Initializes all Rama resources for a manager
;; - init-rama!                 : Initialize Rama with either IPC or cluster manager
;; - close-rama!                : Close Rama manager and reset system state

(def rama-manager (atom nil))

(defn get-depot [k]
  (get-in @system [:depot k]))

(defn get-pstate [k]
  (get-in @system [:pstate k]))

(defn get-query [k]
  (get-in @system [:query k]))

(defn key->depot-name [k]
  (str "*" (name k)))

(defn key->pstate-name [k]
  (str "$$" (name k)))

(defn key->query-name [k]
  (name k))

(defn init-depots! [mgr module-name depot-keys]
  (doseq [k depot-keys]
    (swap! system assoc-in [:depot k]
           (foreign-depot mgr module-name (key->depot-name k)))))

(defn init-pstates! [mgr module-name pstate-keys]
  (doseq [k pstate-keys]
    (swap! system assoc-in [:pstate k]
           (foreign-pstate mgr module-name (key->pstate-name k)))))

(defn init-queries! [mgr module-name query-keys]
  (doseq [k query-keys]
    (swap! system assoc-in [:query k]
           (foreign-query mgr module-name (key->query-name k)))))

(def rama-config
  {:module-name "backend.core/MainModule"
   :depots [:ingest-celex-depot
            :ingest-regulations-depot
            :master-switch-depot]

   :pstates [:celex
             :ingest-queue
             :ingest-current-year
             :regulations
             :ingest-processing?
             :timeout
             :ingest-retries

             :regulations-by-year
             :review-queue
             :reviews-by-year
             :verdicts
             :current-year
             :processing?
             :processing-since
             :year-stats
             :retries
             :master-switch]
   :queries [:chart-query
             :verdict
             :table-reviews-query]})

(defn- init-rama-resources!
  "Initialize all Rama resources (depots, pstates, queries) for a given manager."
  [mgr {:keys [module-name depots pstates queries]}]
  (prn "Initing depots")
  (init-depots! mgr module-name depots)

  (prn "Initing pstates")
  (init-pstates! mgr module-name pstates)

  (prn "Initing queries")
  (init-queries! mgr module-name queries))

(defn init-rama!
  "Initialize Rama with either IPC or cluster manager.
   
   Options:
   - :mode - either :ipc or :cluster (default :cluster)
   - :conductor-host - hostname for cluster manager (default \"localhost\")
   - :ipc-opts - map of options for IPC cluster (default {:tasks 4 :threads 2})"
  [& {:keys [mode conductor-host ipc-opts]
      :or {mode :cluster
           conductor-host "localhost"
           ipc-opts {:tasks 4 :threads 2}}}]
  (let [mgr (case mode
              :ipc (let [ipc (rtest/create-ipc)]
                     (rtest/launch-module! ipc backend.core/MainModule ipc-opts)
                     ipc)
              :cluster (open-cluster-manager {"conductor.host" conductor-host})
              (throw (ex-info "Invalid mode. Must be :ipc or :cluster" {:mode mode})))]

    (reset! rama-manager mgr)
    (init-rama-resources! mgr rama-config)

    (prn (str "Rama initialized in " (name mode) " mode!"))
    mgr))

(defn close-rama!
  []
  (when-let [mgr @rama-manager]
    (close! mgr)
    (reset! rama-manager nil)
    (reset! system {:depot {} :pstate {} :query {}})
    (prn "Rama closed!")))

(comment
  ;; Development - IPC mode
  (init-rama! :mode :ipc)

  ;; Production - cluster mode
  (init-rama! :mode :cluster)

  ;; Production with custom conductor host
  (init-rama! :mode :cluster :conductor-host "my-conductor.example.com")

  ;; IPC with custom options
  (init-rama! :mode :ipc :ipc-opts {:tasks 8 :threads 4})

  ;; Close when done
  (close-rama!))



;; ============================================================================
;; EVENT HANDLING & QUERIES
;; ============================================================================

;; Implements the event handling system for processing client requests and
;; interfacing with the Rama module's resources (depots, pstates, and queries)
;;
;; Table of Contents:
;; - -event-handler                : Multimethod for dispatching events by ID
;; - handle-event                  : Main event processing function with error handling
;; - :query/verdicts               : Event handler for fetching verdict statistics
;; - :query/chart-data             : Event handler for fetching chart data (year stats)
;; - :query/table-data             : Event handler for fetching review table data by year


(defmulti -event-handler
  (fn [{:keys [id]}] id))

(defmethod -event-handler :default [{:keys [id]}]
  (throw (ex-info "Unknown event type" {:event id})))

(defn handle-event
  [event]
  (let [id (first event)
        data (second event)
        handler-fn (get-method -event-handler id)]
    (if (= handler-fn (get-method -event-handler :default))
      {:success false :error (str "Unknown action: " id)}
      (try
        (let [result (handler-fn data)]
          {:success true :data result})
        (catch Exception e
          {:status 500
           :body {:success false :error (.getMessage e)}})))))

(defmethod -event-handler :query/verdicts
  [_data]
  (foreign-invoke-query (get-query :verdict)))

(defmethod -event-handler :query/chart-data
  [_data]
  (foreign-invoke-query (get-query :chart-query)))

(defmethod -event-handler :query/table-data
  [{:keys [year]}]
  (foreign-invoke-query (get-query :table-reviews-query) (long year)))



;; ============================================================================
;; ROUTER
;; ============================================================================

(defn ingest-celex! []
  (let [file-path "resources/celex/all-years.edn"
        data (edn/read-string (slurp file-path))]
    (doseq [[year celex-set] data]
      (println "Ingesting year" year "with" (count celex-set) "celex entries")
      (foreign-append! (get-depot :ingest-celex-depot) {:year year :set celex-set}))))

(defn static-file-handler [req]
  (let [uri (:uri req)
        file-path (str "public" uri)
        file (io/file file-path)]
    (if (.exists file)
      (let [response (response/file-response file-path)]
        (if (str/ends-with? uri ".svg")
          (assoc-in response [:headers "Content-Type"] "image/svg+xml")
          response))
      {:status 404 :body "Not Found"})))

(def routes
  [["/" {:get
         (fn [_]
           {:status 200
            :headers {"Content-Type" "text/html; charset=utf-8"}
            :body (slurp "public/index.html")})}]

   ["/api/event" {:post
                  (fn [req]
                    (let [body (slurp (:body req))
                          [id data] (json/parse-string body true)
                          event [(keyword id) data]
                          result (handle-event event)]
                      {:status 200
                       :headers {"Content-Type" "application/json"}
                       :body (json/generate-string result)}))}]

   ["/api/ingest" {:post
                   (fn [req]
                     (let [token (get-in req [:headers "x-admin-token"])
                           expected (System/getenv "ADMIN_TOKEN")]
                       (if (not= token expected)
                         {:status 403
                          :headers {"Content-Type" "application/json"}
                          :body (json/generate-string {:success false :error "Unauthorized"})}
                         (try
                           (ingest-celex!)
                           {:status 200
                            :headers {"Content-Type" "application/json"}
                            :body (json/generate-string {:success true :message "Ingestion complete"})}
                           (catch Exception e
                             {:status 500
                              :headers {"Content-Type" "application/json"}
                              :body (json/generate-string {:success false :error (.getMessage e)})})))))}]

   ["/api/master-switch" {:post
                          (fn [req]
                            (let [token (get-in req [:headers "x-admin-token"])
                                  expected (System/getenv "ADMIN_TOKEN")]
                              (if (not= token expected)
                                {:status 403
                                 :headers {"Content-Type" "application/json"}
                                 :body (json/generate-string {:success false :error "Unauthorized"})}
                                (try
                                  (let [body (json/parse-string (slurp (:body req)) true)
                                        on?  (:on body)]
                                    (foreign-append! (get-depot :master-switch-depot) (boolean on?))
                                    {:status 200
                                     :headers {"Content-Type" "application/json"}
                                     :body (json/generate-string {:success true :on on?})})
                                  (catch Exception e
                                    {:status 500
                                     :headers {"Content-Type" "application/json"}
                                     :body (json/generate-string {:success false :error (.getMessage e)})})))))}]

   ["/backend/publiccode.clj" {:get
                               (fn [_]
                                 {:status 200
                                  :headers {"Content-Type" "text/plain; charset=utf-8"}
                                  :body (slurp "src/backend/publiccode.clj")})}]
   ["/assets/*"
    {:get {:handler static-file-handler
           :name ::static-files}}]])

(defn app []
  (ring/ring-handler
   (ring/router routes)))

;; ============================================================================
;; SERVER
;; ============================================================================

;; Router and ring handler
;;
;; Table of Contents:
;; - server          - gets server from state atom
;; - start-server    - boots server and rama
;; - stop-server     - closes server and rama
;; - -main           - main entry point to app

(defn server []
  (get @system :server))

(defn start-server []
  (when (server) (.stop (server)))
  (init-rama! :mode :cluster)
  (let [port (Integer/parseInt (or (System/getenv "PORT") "4000"))]
    (println "Starting server on port" port)
    (swap! system assoc :server
           (jetty/run-jetty (app)
                            {:port port :join? false}))
    (prn "Server started")))

(defn stop-server []
  (when (server)
    (.stop (server))
    (when @rama-manager (close-rama!))
    (swap! system assoc :server nil)
    (println "Server stopped.")))

(defn -main []
  (start-server))
