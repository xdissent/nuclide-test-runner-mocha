'use babel'

const fs = require('fs')
const path = require('path')
const {spawn} = require('child_process')

const REPORTER = require.resolve('./reporter.js')
const ARGS = ['-C', '-R', REPORTER]

const BAD_OPTS = {
  '--opts': 2,
  '--recursive': 1,
  '--reporter-options': 2,
  '--reporter': 2,
  '--watch-extensions': 2,
  '--watch': 1,
  '-O': 2,
  '-R': 2,
  '-w': 1
}

const OK_OPTS = {
  '--compilers': 2,
  '--globals': 2,
  '--fgrep': 2,
  '--grep': 2,
  '--require': 2,
  '--slow': 2,
  '--timeout': 2,
  '--ui': 2,
  '-f': 2,
  '-g': 2,
  '-r': 2,
  '-s': 2,
  '-t': 2,
  '-u': 2
}

class MochaTestRunner {
  constructor (uri, cmd, args, opts, sentinel) {
    this.uri = uri
    this.cmd = cmd
    this.args = args
    this.opts = opts
    this.sentinel = sentinel
    this.carry = ''
  }

  do (fn) {
    this.msg = fn
    return this
  }

  finally (fn) {
    this.done = fn
    return this
  }

  subscribe () {
    this.run()
    return this
  }

  unsubscribe = () => this

  cwd (dir = path.dirname(this.uri)) {
    return new Promise((resolve, reject) => {
      fs.stat(path.join(dir, this.sentinel), (err, stat) => {
        if (!err) return resolve(dir)
        const dir_ = path.dirname(dir)
        if (dir === dir_) return reject(err)
        resolve(this.cwd(dir_))
      })
    })
  }

  report = (data) => {
    data.toString().split('\n').forEach(l => {
      try {
        const msg = JSON.parse(this.carry + l)
        this.carry = ''
        if (typeof msg === 'object' && msg.kind) return this.msg(msg)
      } catch (err) {
        if (this.carry || l.startsWith('{"kind":')) {
          this.carry += l
          return
        }
      }
      this.stderr(this.carry + l)
      this.carry = ''
    })
  }

  stderr = (data) => this.msg({kind: 'stderr', data})

  exec = ([cwd, opts]) => {
    const start = Date.now()
    const args = [...opts, ...this.args, ...ARGS, this.uri]
    const env = {...process.env, LOADED_MOCHA_OPTS: 1}
    return new Promise((resolve, reject) => {
      let errored = false
      let stderr = ''
      const flush = () => stderr && this.stderr(stderr)
      const child = spawn(this.cmd, args, {cwd, env})
      child.stdout.on('data', this.report)
      child.stderr.on('data', d => {
        const lines = (stderr + d.toString()).split('\n')
        stderr = lines.pop()
        lines.forEach(this.stderr)
      })
      child.on('error', err => {
        errored = true
        flush()
        reject(err)
      })
      child.on('close', code => {
        if (errored) return
        flush()
        resolve()
      })
    })
  }

  error = (err) => {
    this.msg({kind: 'error', error: err})
  }

  config = (cwd) => {
    return new Promise((resolve, reject) => {
      fs.readFile(path.join(cwd, this.opts), 'utf8', (err, data) => {
        if (err) return resolve([cwd, []])
        const {opts, last} = data
          .replace(/\\\s/g, '%20')
          .split(/\s/)
          .filter(Boolean)
          .map(value => value.replace(/%20/g, ' '))
          .reduce((memo, opt) => {
            const skip = memo.skip || BAD_OPTS[opt]
            if (skip) return {...memo, skip: skip - 1}
            return {
              opts: [...memo.opts, opt],
              last: opt.startsWith('-') ? memo.opts.length + (OK_OPTS[opt] || 1) : memo.last
            }
          }, {opts: [], last: 0})
        resolve([cwd, opts.slice(0, last)])
      })
    })
  }

  run () {
    return this.cwd()
      .then(this.config)
      .then(this.exec)
      .catch(this.error)
      .then(this.done)
  }
}

export default {
  config: {
    cmd: {
      type: 'string',
      default: 'node_modules/.bin/mocha'
    },
    args: {
      type: 'array',
      default: [],
      items: {
        type: 'string'
      }
    },
    opts: {
      type: 'string',
      default: 'test/mocha.opts'
    },
    sentinel: {
      type: 'string',
      default: 'package.json'
    }
  },
  provideTestRunner () {
    const cmd = atom.config.get('nuclide-test-runner-mocha.cmd')
    const args = atom.config.get('nuclide-test-runner-mocha.args')
    const opts = atom.config.get('nuclide-test-runner-mocha.opts')
    const sentinel = atom.config.get('nuclide-test-runner-mocha.sentinel')
    return {
      label: 'mocha',
      runTest (uri) {
        return new MochaTestRunner(uri, cmd, args, opts, sentinel)
      }
    }
  }
}
