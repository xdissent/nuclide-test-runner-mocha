'use strict'

const mocha = require('mocha')
const Base = mocha.reporters.Base

const STATUS = {
  PASSED: 1,
  FAILED: 2,
  SKIPPED: 3,
  FATAL: 4,
  TIMEOUT: 5,
}

module.exports = class NuclideReporter extends Base {
  constructor (runner) {
    super(runner)
    this.summarize()
    runner.on('start', () => this.start())
    // HACK: `test.timedOut` is set after callback is called
    runner.on('test end', t => process.nextTick(() => this.report(t)))
  }

  msg (msg) {
    process.stdout.write(JSON.stringify(msg) + '\n')
  }

  start () {
    this.msg({kind: 'start'})
  }

  summarize () {
    this.msg({kind: 'summary', summaryInfo: this.summaries()})
  }

  report (t) {
    this.msg({kind: 'run-test', testInfo: this.testInfo(t)})
  }

  summaries () {
    const ss = []
    this.runner.suite.eachTest(t => ss.push(this.testSummary(t)))
    return ss
  }

  testSummary (t) {
    return {
      className: t.fullTitle(),
      fileName: t.file,
      id: t.fullTitle(),
      name: t.fullTitle()
    }
  }

  testInfo (t) {
    const s = this.testStatus(t)
    return {
      details: t.err ? t.err.toString() : '',
      durationSecs: (t.duration || 0) / 1000,
      name: t.fullTitle(),
      numAssertions: 1,
      numFailures: s === STATUS.FAILED || s === STATUS.TIMEOUT ? 1 : 0,
      numMethods: 1,
      numSkipped: s === STATUS.SKIPPED ? 1 : 0,
      status: s,
      test_json: {id: t.fullTitle()}
    }
  }

  testStatus (t) {
    switch (t.state) {
      case 'passed':
        return STATUS.PASSED
      case 'failed':
        return t.timedOut ? STATUS.TIMEOUT : STATUS.FAILED
      default:
        return STATUS.SKIPPED
    }
  }
}
