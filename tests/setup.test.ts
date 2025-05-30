/**
 * Basic setup test to verify Jest configuration
 */

describe('Test Setup', () => {
  it('should run tests successfully', () => {
    expect(true).toBe(true)
  })

  it('should have access to environment variables', () => {
    // These should be defined in the test environment
    expect(process.env.NODE_ENV).toBeDefined()
  })

  it('should support TypeScript', () => {
    const testObject: { name: string; value: number } = {
      name: 'test',
      value: 42
    }
    
    expect(testObject.name).toBe('test')
    expect(testObject.value).toBe(42)
  })
})
