use thiserror::Error;

#[derive(Debug, Error, PartialEq)]
pub enum Error {
    #[error("incorrect master password")]
    IncorrectPassword,
    #[error("invalid vault file")]
    InvalidVaultFile,
    #[error("vault is locked")]
    VaultLocked,
    #[error("entry not found: {0}")]
    NotFound(String),
    #[error("validation error: {0}")]
    Validation(String),
    #[error("io error: {0}")]
    Io(String),
    #[error("crypto error: {0}")]
    Crypto(String),
    #[error("serialization error: {0}")]
    Serialization(String),
}

pub type Result<T> = std::result::Result<T, Error>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn variants_display_correctly() {
        assert_eq!(Error::IncorrectPassword.to_string(), "incorrect master password");
        assert_eq!(Error::InvalidVaultFile.to_string(), "invalid vault file");
        assert_eq!(Error::VaultLocked.to_string(), "vault is locked");
        assert_eq!(Error::NotFound("abc".into()).to_string(), "entry not found: abc");
        assert_eq!(Error::Validation("bad".into()).to_string(), "validation error: bad");
        assert_eq!(Error::Io("disk".into()).to_string(), "io error: disk");
        assert_eq!(Error::Crypto("kdf".into()).to_string(), "crypto error: kdf");
        assert_eq!(Error::Serialization("json".into()).to_string(), "serialization error: json");
    }
}
