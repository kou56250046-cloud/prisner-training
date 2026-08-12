/**
 * コンテンツの暗号化・復号。Node（ビルド時）とブラウザ（実行時）の両方から使う。
 *
 * public リポジトリで運用するため、書籍由来の本文は平文でリポジトリに置かない。
 * ビルド時に AES-GCM で暗号化した 1ファイルだけをコミットし、
 * アプリ側は初回起動時にパスフレーズを受け取って復号する。
 *
 * ファイル形式:
 *   "PTC1"(4) | salt(16) | iv(12) | ciphertext(可変)
 */

const MAGIC = 'PTC1'
const SALT_LEN = 16
const IV_LEN = 12
const PBKDF2_ITER = 210_000

const enc = new TextEncoder()
const dec = new TextDecoder()

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITER, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptContent(plaintext: string, passphrase: string): Promise<Uint8Array> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN))
  const key = await deriveKey(passphrase, salt)
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, enc.encode(plaintext)),
  )

  const out = new Uint8Array(MAGIC.length + SALT_LEN + IV_LEN + cipher.length)
  out.set(enc.encode(MAGIC), 0)
  out.set(salt, MAGIC.length)
  out.set(iv, MAGIC.length + SALT_LEN)
  out.set(cipher, MAGIC.length + SALT_LEN + IV_LEN)
  return out
}

export class WrongPassphraseError extends Error {
  constructor() {
    super('合い言葉が違います')
    this.name = 'WrongPassphraseError'
  }
}

export async function decryptContent(blob: Uint8Array, passphrase: string): Promise<string> {
  if (dec.decode(blob.subarray(0, MAGIC.length)) !== MAGIC) {
    throw new Error('コンテンツファイルの形式が不正です')
  }
  const salt = blob.subarray(MAGIC.length, MAGIC.length + SALT_LEN)
  const iv = blob.subarray(MAGIC.length + SALT_LEN, MAGIC.length + SALT_LEN + IV_LEN)
  const cipher = blob.subarray(MAGIC.length + SALT_LEN + IV_LEN)

  const key = await deriveKey(passphrase, salt)
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      cipher as BufferSource,
    )
    return dec.decode(plain)
  } catch {
    // AES-GCM は認証付きなので、鍵が違えば必ずここに来る
    throw new WrongPassphraseError()
  }
}
