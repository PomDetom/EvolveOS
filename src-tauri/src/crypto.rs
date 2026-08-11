/// API key 等敏感字段加密
///
/// Windows 上使用 DPAPI (CryptProtectData) 加密, 密文以 "dpapi:" 前缀 + base64 落盘;
/// 非 Windows 平台降级为明文存储(前缀 "plain:")。
/// 前缀使文件可自描述, 且旧版明文配置可被无缝迁移。

const DPAPI_PREFIX: &str = "dpapi:";
const PLAIN_PREFIX: &str = "plain:";

/// 加密明文 -> 存储字符串(带前缀)
pub fn encrypt(plain: &str) -> String {
    #[cfg(windows)]
    {
        match dpapi_encrypt(plain.as_bytes()) {
            Ok(ct) => format!("{DPAPI_PREFIX}{}", base64_encode(&ct)),
            Err(e) => {
                log::warn!("DPAPI 加密失败, 降级明文存储: {e}");
                format!("{PLAIN_PREFIX}{}", base64_encode(plain.as_bytes()))
            }
        }
    }
    #[cfg(not(windows))]
    {
        format!("{PLAIN_PREFIX}{}", base64_encode(plain.as_bytes()))
    }
}

/// 解密存储字符串 -> 明文; 无前缀的旧配置视为明文原样返回
pub fn decrypt(stored: &str) -> String {
    if let Some(b64) = stored.strip_prefix(DPAPI_PREFIX) {
        #[cfg(windows)]
        {
            match base64_decode(b64).ok().and_then(|ct| dpapi_decrypt(&ct).ok()) {
                Some(plain) => String::from_utf8_lossy(&plain).to_string(),
                None => {
                    log::warn!("DPAPI 解密失败, 返回原存储值");
                    stored.to_string()
                }
            }
        }
        #[cfg(not(windows))]
        {
            stored.to_string()
        }
    } else if let Some(b64) = stored.strip_prefix(PLAIN_PREFIX) {
        base64_decode(b64)
            .ok()
            .and_then(|b| String::from_utf8(b).ok())
            .unwrap_or_else(|| stored.to_string())
    } else {
        // 旧版明文配置(无前缀)
        stored.to_string()
    }
}

#[cfg(windows)]
fn dpapi_encrypt(plain: &[u8]) -> Result<Vec<u8>, String> {
    use windows_sys::Win32::Security::Cryptography::{
        CryptProtectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
    };

    let mut in_blob = CRYPT_INTEGER_BLOB {
        cbData: plain.len() as u32,
        pbData: plain.as_ptr() as *mut u8,
    };
    let mut out_blob = CRYPT_INTEGER_BLOB {
        cbData: 0,
        pbData: std::ptr::null_mut(),
    };

    let ok = unsafe {
        CryptProtectData(
            &mut in_blob,
            std::ptr::null(),
            std::ptr::null(),
            std::ptr::null_mut(),
            std::ptr::null(),
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut out_blob,
        )
    };
    if ok == 0 {
        return Err(format!("CryptProtectData 失败, 错误码 {}", std::io::Error::last_os_error().raw_os_error().unwrap_or(-1)));
    }

    let ct = unsafe { std::slice::from_raw_parts(out_blob.pbData, out_blob.cbData as usize) }.to_vec();
    unsafe {
        windows_sys::Win32::Foundation::LocalFree(out_blob.pbData as _);
    }
    Ok(ct)
}

#[cfg(windows)]
fn dpapi_decrypt(ciphertext: &[u8]) -> Result<Vec<u8>, String> {
    use windows_sys::Win32::Security::Cryptography::{
        CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
    };

    let mut in_blob = CRYPT_INTEGER_BLOB {
        cbData: ciphertext.len() as u32,
        pbData: ciphertext.as_ptr() as *mut u8,
    };
    let mut out_blob = CRYPT_INTEGER_BLOB {
        cbData: 0,
        pbData: std::ptr::null_mut(),
    };

    let ok = unsafe {
        CryptUnprotectData(
            &mut in_blob,
            std::ptr::null_mut(),
            std::ptr::null(),
            std::ptr::null_mut(),
            std::ptr::null(),
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut out_blob,
        )
    };
    if ok == 0 {
        return Err(format!("CryptUnprotectData 失败, 错误码 {}", std::io::Error::last_os_error().raw_os_error().unwrap_or(-1)));
    }

    let pt = unsafe { std::slice::from_raw_parts(out_blob.pbData, out_blob.cbData as usize) }.to_vec();
    unsafe {
        windows_sys::Win32::Foundation::LocalFree(out_blob.pbData as _);
    }
    Ok(pt)
}

fn base64_encode(bytes: &[u8]) -> String {
    use base64::Engine;
    base64::engine::general_purpose::STANDARD.encode(bytes)
}

fn base64_decode(s: &str) -> Result<Vec<u8>, String> {
    use base64::Engine;
    base64::engine::general_purpose::STANDARD
        .decode(s)
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip() {
        let secret = "sk-test-abc123";
        let stored = encrypt(secret);
        // 必须带前缀, 且不是明文
        assert!(stored.starts_with("dpapi:") || stored.starts_with("plain:"));
        assert_ne!(stored, secret);
        assert_eq!(decrypt(&stored), secret);
    }

    #[test]
    fn legacy_plain_passthrough() {
        let old = "sk-legacy-明文";
        assert_eq!(decrypt(old), old);
    }
}
