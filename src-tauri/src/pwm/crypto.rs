use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use argon2::{Algorithm, Argon2, Params, Version};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use rand::RngCore;

use crate::pwm::error::Error;
use crate::pwm::models::{DiskCipher, DiskFile, DiskKdf};

pub const KDF_M_COST: u32 = 19456;
pub const KDF_T_COST: u32 = 2;
pub const KDF_P_COST: u32 = 1;
pub const SALT_LEN: usize = 16;
pub const NONCE_LEN: usize = 12;

pub fn derive_key(password: &str, salt: &[u8], m_cost: u32, t_cost: u32, p_cost: u32) -> crate::pwm::Result<[u8; 32]> {
    let params = Params::new(m_cost, t_cost, p_cost, Some(32)).map_err(|e| Error::Crypto(e.to_string()))?;
    let argon = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut key = [0u8; 32];
    argon
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|e| Error::Crypto(e.to_string()))?;
    Ok(key)
}

pub fn random_salt() -> [u8; SALT_LEN] {
    let mut salt = [0u8; SALT_LEN];
    rand::thread_rng().fill_bytes(&mut salt);
    salt
}

pub fn encrypt_to_disk(vault_json: &[u8], key: &[u8; 32], salt: &[u8]) -> crate::pwm::Result<DiskFile> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| Error::Crypto(e.to_string()))?;
    let mut nonce_bytes = [0u8; NONCE_LEN];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher.encrypt(nonce, vault_json).map_err(|e| Error::Crypto(e.to_string()))?;
    Ok(DiskFile {
        version: 1,
        kdf: DiskKdf {
            algorithm: "argon2id".into(),
            m_cost: KDF_M_COST,
            t_cost: KDF_T_COST,
            p_cost: KDF_P_COST,
            salt: BASE64.encode(salt),
        },
        cipher: DiskCipher { algorithm: "aes-256-gcm".into(), nonce: BASE64.encode(nonce_bytes) },
        ciphertext: BASE64.encode(ciphertext),
    })
}

pub fn decrypt_disk(file: &DiskFile, key: &[u8; 32]) -> crate::pwm::Result<Vec<u8>> {
    if file.version != 1 || file.kdf.algorithm != "argon2id" || file.cipher.algorithm != "aes-256-gcm" {
        return Err(Error::InvalidVaultFile);
    }
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| Error::Crypto(e.to_string()))?;
    let nonce_bytes = BASE64.decode(&file.cipher.nonce).map_err(|e| Error::Serialization(e.to_string()))?;
    if nonce_bytes.len() != NONCE_LEN {
        return Err(Error::InvalidVaultFile);
    }
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ct = BASE64.decode(&file.ciphertext).map_err(|e| Error::Serialization(e.to_string()))?;
    cipher.decrypt(nonce, ct.as_ref()).map_err(|_| Error::IncorrectPassword)
}

#[cfg(test)]
mod tests {
    use super::*;

    const PASSWORD: &str = "correct horse battery staple";

    #[test]
    fn derive_key_is_stable_for_same_input() {
        let salt = [7u8; SALT_LEN];
        let k1 = derive_key(PASSWORD, &salt, KDF_M_COST, KDF_T_COST, KDF_P_COST).unwrap();
        let k2 = derive_key(PASSWORD, &salt, KDF_M_COST, KDF_T_COST, KDF_P_COST).unwrap();
        assert_eq!(k1, k2);
        assert_eq!(k1.len(), 32);
    }

    #[test]
    fn derive_key_differs_with_different_salt() {
        let s1 = [1u8; SALT_LEN];
        let s2 = [2u8; SALT_LEN];
        let k1 = derive_key(PASSWORD, &s1, KDF_M_COST, KDF_T_COST, KDF_P_COST).unwrap();
        let k2 = derive_key(PASSWORD, &s2, KDF_M_COST, KDF_T_COST, KDF_P_COST).unwrap();
        assert_ne!(k1, k2);
    }

    #[test]
    fn encrypt_decrypt_round_trip() {
        let plaintext = b"{\"hello\":\"world\"}";
        let salt = [9u8; SALT_LEN];
        let key = derive_key(PASSWORD, &salt, KDF_M_COST, KDF_T_COST, KDF_P_COST).unwrap();
        let file = encrypt_to_disk(plaintext, &key, &salt).unwrap();
        assert_eq!(file.cipher.algorithm, "aes-256-gcm");
        assert_eq!(file.kdf.algorithm, "argon2id");
        assert_ne!(file.ciphertext, BASE64.encode(plaintext));
        let decrypted = decrypt_disk(&file, &key).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn decrypt_with_wrong_key_fails() {
        let plaintext = b"secret vault data";
        let salt = [9u8; SALT_LEN];
        let key = derive_key(PASSWORD, &salt, KDF_M_COST, KDF_T_COST, KDF_P_COST).unwrap();
        let file = encrypt_to_disk(plaintext, &key, &salt).unwrap();
        let wrong = derive_key("wrong password", &salt, KDF_M_COST, KDF_T_COST, KDF_P_COST).unwrap();
        let err = decrypt_disk(&file, &wrong).unwrap_err();
        assert_eq!(err, Error::IncorrectPassword);
    }

    #[test]
    fn tampered_ciphertext_fails_decrypt() {
        let plaintext = b"tamper me";
        let salt = [3u8; SALT_LEN];
        let key = derive_key(PASSWORD, &salt, KDF_M_COST, KDF_T_COST, KDF_P_COST).unwrap();
        let mut file = encrypt_to_disk(plaintext, &key, &salt).unwrap();
        let mut raw = BASE64.decode(&file.ciphertext).unwrap();
        raw[0] ^= 0xff;
        file.ciphertext = BASE64.encode(raw);
        assert!(decrypt_disk(&file, &key).is_err());
    }

    #[test]
    fn decrypt_rejects_unknown_version() {
        let plaintext = b"data";
        let salt = [4u8; SALT_LEN];
        let key = derive_key(PASSWORD, &salt, KDF_M_COST, KDF_T_COST, KDF_P_COST).unwrap();
        let mut file = encrypt_to_disk(plaintext, &key, &salt).unwrap();
        file.version = 99;
        let err = decrypt_disk(&file, &key).unwrap_err();
        assert_eq!(err, Error::InvalidVaultFile);
    }

    #[test]
    fn decrypt_rejects_wrong_length_nonce() {
        let plaintext = b"data";
        let salt = [5u8; SALT_LEN];
        let key = derive_key(PASSWORD, &salt, KDF_M_COST, KDF_T_COST, KDF_P_COST).unwrap();
        let mut file = encrypt_to_disk(plaintext, &key, &salt).unwrap();
        file.cipher.nonce = BASE64.encode([0u8; NONCE_LEN + 1]);
        let err = decrypt_disk(&file, &key).unwrap_err();
        assert_eq!(err, Error::InvalidVaultFile);
    }
}
