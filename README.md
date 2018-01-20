# CPSC 310 D0 Repository

This is the base repository for CPSC310 Deliverable 0. This is an individual deliverable. Please keep your repository private.

Piazza is your best resource for additional details about the [project](https://github.com/ubccpsc/310/blob/2018jan/project/README.md), [AutoTest](https://github.com/ubccpsc/310/blob/2018jan/project/AutoTest.md), and the specific requirements of each project deliverable. These resources will be frequently updated as the term progresses.

## Configuring your environment

To start using this project, you need to get your computer configured so you can build and execute the code. To do this, follow these steps; the specifics of each step (especially the first two) will vary based on which operating system your computer has:

1. Install git (you should be able to execute `git --version` on the command line).

1. Install Node LTS  (8.9.X), which will also install NPM (you should be able to execute `node --version` and `npm --version` on the command line).

1. [Install Yarn](https://yarnpkg.com/en/docs/install). You should be able to execute `yarn --version` afterwards.

1. Clone the project: `CPSC310-2017W-T2/cpsc310_d0_teamXXX` (where `XXX` is your team ID). You can find your team ID and clone the repo by visiting your project in GitHub and getting the clone target by clicking on the green button on your project repository.

## Project commands

Once your environment is configured you need to further prepare the project's tooling and dependencies. In the project folder:

1. `yarn clean` (or `yarn cleanwin` if you are using Windows) to delete your project's *node_modules* directory.

1. `yarn install` to download the packages specified in your project's *package.json* to the *node_modules* directory.

1. `yarn build` to compile your project. You must run this command after making changes to your TypeScript files.

1. `yarn test` to run the test suite.

## Running and testing from an IDE

WebStorm should be automatically configured the first time you open the project. For other IDEs and editors, you'll want to set up test and debug tasks and specify that the schema of all files in `test/queries` should follow `test/query.schema.json`.
