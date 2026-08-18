use serde::{Deserialize, Serialize};

pub const VAULT_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Entry {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub url: Option<String>,
    pub username: String,
    pub password: String,
    #[serde(default)]
    pub notes: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    pub created_at: u64,
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Vault {
    pub version: u32,
    pub entries: Vec<Entry>,
}

impl Vault {
    pub fn new() -> Self {
        Self { version: VAULT_VERSION, entries: Vec::new() }
    }
}

impl Default for Vault {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntryInput {
    pub name: String,
    #[serde(default)]
    pub url: Option<String>,
    pub username: String,
    pub password: String,
    #[serde(default)]
    pub notes: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DiskFile {
    pub version: u32,
    pub kdf: DiskKdf,
    pub cipher: DiskCipher,
    pub ciphertext: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DiskKdf {
    pub algorithm: String,
    pub m_cost: u32,
    pub t_cost: u32,
    pub p_cost: u32,
    pub salt: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DiskCipher {
    pub algorithm: String,
    pub nonce: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_entry() -> Entry {
        Entry {
            id: "e1".into(),
            name: "GitHub".into(),
            url: Some("https://github.com".into()),
            username: "user".into(),
            password: "secret".into(),
            notes: Some("work".into()),
            tags: vec!["work".into(), "dev".into()],
            created_at: 1000,
            updated_at: 1000,
        }
    }

    #[test]
    fn entry_serde_round_trip_preserves_all_fields() {
        let e = sample_entry();
        let json = serde_json::to_string(&e).unwrap();
        let back: Entry = serde_json::from_str(&json).unwrap();
        assert_eq!(back, e);
    }

    #[test]
    fn entry_optional_fields_default_to_none() {
        let json = r#"{"id":"x","name":"n","username":"u","password":"p","created_at":1,"updated_at":1}"#;
        let e: Entry = serde_json::from_str(json).unwrap();
        assert_eq!(e.url, None);
        assert_eq!(e.notes, None);
        assert!(e.tags.is_empty());
    }

    #[test]
    fn vault_new_has_version_and_no_entries() {
        let v = Vault::new();
        assert_eq!(v.version, VAULT_VERSION);
        assert!(v.entries.is_empty());
    }

    #[test]
    fn disk_file_serde_round_trip() {
        let df = DiskFile {
            version: 1,
            kdf: DiskKdf {
                algorithm: "argon2id".into(),
                m_cost: 1,
                t_cost: 1,
                p_cost: 1,
                salt: "c2FsdA==".into(),
            },
            cipher: DiskCipher { algorithm: "aes-256-gcm".into(), nonce: "bm9uY2U=".into() },
            ciphertext: "Y2lwaGVydGV4dA==".into(),
        };
        let json = serde_json::to_string_pretty(&df).unwrap();
        let back: DiskFile = serde_json::from_str(&json).unwrap();
        assert_eq!(back, df);
    }
}
