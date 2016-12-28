
# nuclide-test-runner-mocha

This package adds a Nuclide test runner for mocha tests.

## Configuration

| Option      | Type        | Default                     | Description                 |
| :---------- | :---------- | :-------------------------- | :-------------------------- |
| `cmd`       | `string`    | `'node_modules/.bin/mocha'` | Mocha bin path              |
| `args`      | `string[]`  | `[]`                        | Additional mocha arguments  |
| `opts`      | `string`    | `'test/mocha.opts'`         | Mocha options file path     |
| `sentinel`  | `string`    | `'package.json'`            | File whose existence in a parent directory determines `cwd` for the command |

Any reporters or test files given in `test/mocha.opts` will be ignored.
