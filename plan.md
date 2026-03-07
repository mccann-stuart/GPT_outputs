1. **Understand:** The file `gammamodel.jsx` contains code that calculates yearly data based on settings and displays it in a table. In several places, there are loops mapping over `products` or `years` where it searches through `yearlyData` with an O(N) array search using `.find(d => d.year === y)`. Specifically, at lines 415, 437, and 613, it uses `yearlyData.find(d => d.year === y)` inside loops, resulting in an O(M*N) search inside rendering loops. The user requests converting `yearlyData` array to an object keyed by year (`dataByYear`) using `useMemo` and replacing the `.find()` loops with O(1) property access `dataByYear[y]`.

2. **Measure:** Since there isn't a pre-existing benchmark for rendering the Gamma Model in node (it uses JSX with Babel standalone in the browser usually, as mentioned in memory), I will create a small node test that instantiates a simplified version of this logic, or I'll run a component render test, or simply benchmark the specific calculation loop before and after. Actually, I can extract the specific loop rendering code and benchmark it as raw JS.

   Let's create a JS script that imports the array and loops exactly as the component does, and measures execution time for N iterations.

3. **Implement:**
   - Add `const dataByYear = useMemo(() => Object.fromEntries(yearlyData.map(d => [d.year, d])), [yearlyData]);` inside the `GammaModel` component right after `yearlyData` useMemo.
   - Replace `yearlyData.find(d => d.year === 2030)` with `dataByYear[2030]` at lines 249, 250, 251.
   - Replace `yearlyData.find(d => d.year === y)` with `dataByYear[y]` at line 415.
   - Replace `yearlyData.find(r => r.year === y)` with `dataByYear[y]` at line 437.
   - Replace `yearlyData.find(r => r.year === y)` with `dataByYear[y]` at line 613.

4. **Verify:** Check that the component still compiles and works. Run tests if any.

5. **Pre Commit:** Do the pre-commit instructions.
6. **Submit:** Make a PR with title and descriptions as specified.