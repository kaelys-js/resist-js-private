Implement the **O(n) Complexity** lint rules (16 rules).

Rules to implement:
1. `complexity/no-nested-array-iteration` - No O(n²) nested loops over arrays
2. `complexity/no-array-method-in-loop` - No .find/.filter/.includes in loops
3. `complexity/prefer-map-for-lookup` - Use Map for repeated key lookups
4. `complexity/prefer-set-for-existence` - Use Set for existence checks
5. `complexity/no-repeated-traversal` - Combine multiple array passes
6. `complexity/no-index-of-in-loop` - No .indexOf in loops
7. `complexity/no-spread-in-reduce` - No {...acc} or [...acc] in reduce
8. `complexity/no-concat-in-loop` - No string += or array.concat in loops
9. `complexity/no-dom-query-in-loop` - Cache DOM queries outside loops
10. `complexity/no-regex-in-loop` - Compile regex outside loops
11. `complexity/no-sort-in-loop` - Warn on .sort() inside loops
12. `complexity/no-json-parse-in-loop` - No JSON.parse/stringify in loops
13. `complexity/no-await-in-loop` - Use Promise.all for parallel async
14. `complexity/no-filter-map-chain` - Suggest single-pass alternatives
15. `complexity/array-size-warning` - Warn on unbounded array operations
16. `complexity/recursive-depth` - Require depth limits on recursion

Detection approach: Track loop context (for/while/forEach/map/etc.), detect expensive operations inside that context.

For each rule, implement full detection logic with appropriate error messages, tips, and examples.

