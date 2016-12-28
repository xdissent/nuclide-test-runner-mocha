
const assert = require('assert')

describe('it', () => {
  it('should pass', () => {
    assert.ok(true)
  })

  it('should fail', () => {
    throw new Error()
  })

  it.skip('should skip', () => {
  })

  it('should timeout', (done) => {
  })
})
