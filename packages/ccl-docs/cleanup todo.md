Remove the edge cases sectuib in the syntax guide.
Processing pipeline in syntax guide seems out of place.
The “alternative flat stucture” in the getting started guide is wrong - flat dotted keys are treated as straight keys. We should have something about this somewhere already so we just need to link to it.
Getting target multiline values needs to clarify that multiline values need to be indented - other behavior is not necessarily standard.
Review all CCL examples and make sure that comments use the official CCL comment format: /=
Comments and docs section should just be comments or something like  inline docs (comments).
Comments section can mention that other keys could be supported but /= is the one you should prefer.
FAQs what is CCL seems a bit better than the one in getting started.
FAQ entry on dotted keys is useful - do a deep review of the dotted keys references throughout the docs and make sure we refer to them consistently.
Mixing the notation is possible but remember no hierarchy is provided for the dotted keys they are just strings.
Depth FAQ should clarify how the fix point algo addresses depth.
Let’s flag some FAQ’s as “open spec question” - the tabs and spaces support
Remove entry on large config files.
Review the “level” concept - I’m really not convinced it’s useful. Seems like organizing around APIs is better.
Mark the test architecture section as needing review in the future. It is outdated. The whole doc. For future work.
In the parsing algorithm, pick a language that you think would be clear then use that lang instead of pseudocode.
Add a lot of docs to the sample code algorithm - inline docs basically.
Remove perf considerations from parsing doc.
Mark math background as needing review for acuracy.
Format comparison - remove when to choose each, format conversion tools, format selection guide, best practices for format selection, and the common considerations section.
Reword key diff sections to be much more objective in the format comparisons doc.
Glossary is extremely bloated.