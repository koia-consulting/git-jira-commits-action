# Extract JIRA keys GitHub Action

This is a GitHub Action that extracts JIRA keys from pull request titles, commit messages, and branch names of GitHub events. This action can filter where to extract the keys from, such as from PR titles, commit messages, branch names or all. The keys are assumed to follow a standard JIRA format, for example `PROJECT-123`.

## Requirements

This action requires Node.js to be set up in your workflow. If you don't have a Node.js setup step in your workflow yet, you can use the [`actions/setup-node`](https://github.com/actions/setup-node) action.

## Inputs

- `github-token`: **Required**. The GitHub token to use for making API requests. In most cases, you should use the `secrets.GITHUB_TOKEN` provided by GitHub.

- `filter`: Optional. Where to extract JIRA keys from. Can be `pr` (pull request title), `commit` (commit messages), `branch` (branch names), or `all` (all of the above). Defaults to `all`.

## Outputs

- `jira-keys`: A comma-separated list of unique JIRA keys extracted.

## Example usage

```yaml