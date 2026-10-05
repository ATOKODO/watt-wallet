# Visual regression references

[English guide](../docs/en/visual-testing.md) · [Guide français](../docs/fr/visual-testing.md)

Run `npm run test:visual` to compare the application and Storybook with reviewed screenshots.
Run `npm run test:visual:update` only for an intentional change, inspect every changed PNG, then compare again.
Open the HTML difference report with `npm run test:visual:report`.

`baselines/<platform>/<project>/<test-file>/` contains committed reference images.
Failure images, diffs and traces live in the ignored `test-results/visual/` folder.
These references are separate from the documentation screenshot galleries.
