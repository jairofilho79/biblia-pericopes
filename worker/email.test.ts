import { describe, expect, it } from 'vitest'
import { buildOtpLink, otpEmailHtml } from './email'

describe('buildOtpLink', () => {
  it('monta /entrar com email e code escapados', () => {
    expect(buildOtpLink('https://app.dev', 'a+b@x.com', '123456')).toBe(
      'https://app.dev/entrar?email=a%2Bb%40x.com&code=123456',
    )
  })
  it('não duplica barra final do APP_URL', () => {
    expect(buildOtpLink('https://app.dev/', 'a@x.com', '111111')).toBe(
      'https://app.dev/entrar?email=a%40x.com&code=111111',
    )
  })
})

describe('otpEmailHtml', () => {
  it('contém o código e o link', () => {
    const html = otpEmailHtml('654321', 'https://app.dev/entrar?email=a%40x.com&code=654321')
    expect(html).toContain('654321')
    expect(html).toContain('https://app.dev/entrar?email=a%40x.com&code=654321')
  })
})
