use crate::pwm::vault::SessionKey;
use crate::pwm::Vault;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct PwmSession {
    pub vault_path: PathBuf,
    pub vault: Vault,
    pub key: SessionKey,
}

#[derive(Default)]
pub struct PwmState {
    pub session: Mutex<Option<PwmSession>>,
}
