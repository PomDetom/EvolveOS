use rand::seq::SliceRandom;

use crate::pwm::error::Error;

pub struct GeneratorOptions {
    pub length: u32,
    pub use_lower: bool,
    pub use_upper: bool,
    pub use_digits: bool,
    pub use_symbols: bool,
    pub exclude_ambiguous: bool,
}

impl Default for GeneratorOptions {
    fn default() -> Self {
        Self {
            length: 16,
            use_lower: true,
            use_upper: true,
            use_digits: true,
            use_symbols: true,
            exclude_ambiguous: false,
        }
    }
}

const LOWER: &str = "abcdefghijklmnopqrstuvwxyz";
const UPPER: &str = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS: &str = "0123456789";
const SYMBOLS: &str = "!@#$%^&*()-_=+[]{};:,.<>?/~";
const AMBIGUOUS: &[char] = &['0', 'O', '1', 'l', 'I'];

fn filtered(chars: &str, exclude: bool) -> Vec<char> {
    chars.chars().filter(|c| !(exclude && AMBIGUOUS.contains(c))).collect()
}

pub fn generate_password(opts: &GeneratorOptions) -> crate::pwm::Result<String> {
    let mut charsets: Vec<Vec<char>> = Vec::new();
    if opts.use_lower {
        charsets.push(filtered(LOWER, opts.exclude_ambiguous));
    }
    if opts.use_upper {
        charsets.push(filtered(UPPER, opts.exclude_ambiguous));
    }
    if opts.use_digits {
        charsets.push(filtered(DIGITS, opts.exclude_ambiguous));
    }
    if opts.use_symbols {
        charsets.push(filtered(SYMBOLS, opts.exclude_ambiguous));
    }

    if charsets.is_empty() {
        return Err(Error::Validation("at least one character set must be selected".into()));
    }
    if opts.length < charsets.len() as u32 {
        return Err(Error::Validation("length too short for selected character sets".into()));
    }
    if opts.length > 256 {
        return Err(Error::Validation("length exceeds maximum of 256".into()));
    }

    let mut rng = rand::thread_rng();
    let mut result: Vec<char> = Vec::with_capacity(opts.length as usize);

    for set in &charsets {
        result.push(*set.choose(&mut rng).expect("charset is non-empty"));
    }
    let pool: Vec<char> = charsets.iter().flat_map(|s| s.iter().copied()).collect();
    while result.len() < opts.length as usize {
        result.push(*pool.choose(&mut rng).expect("pool is non-empty"));
    }
    result.shuffle(&mut rng);
    Ok(result.into_iter().collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    const OPTS: GeneratorOptions = GeneratorOptions {
        length: 16,
        use_lower: true,
        use_upper: true,
        use_digits: true,
        use_symbols: true,
        exclude_ambiguous: false,
    };

    #[test]
    fn default_length_is_respected() {
        for _ in 0..50 {
            assert_eq!(generate_password(&OPTS).unwrap().chars().count(), 16);
        }
    }

    #[test]
    fn every_selected_charset_appears() {
        for _ in 0..100 {
            let p = generate_password(&OPTS).unwrap();
            assert!(p.chars().any(|c| c.is_ascii_lowercase()), "no lower in {p}");
            assert!(p.chars().any(|c| c.is_ascii_uppercase()), "no upper in {p}");
            assert!(p.chars().any(|c| c.is_ascii_digit()), "no digit in {p}");
            assert!(p.chars().any(|c| !c.is_ascii_alphanumeric()), "no symbol in {p}");
        }
    }

    #[test]
    fn exclude_ambiguous_removes_ambiguous_chars() {
        let opts = GeneratorOptions { exclude_ambiguous: true, ..OPTS };
        for _ in 0..100 {
            let p = generate_password(&opts).unwrap();
            for ch in "0O1lI".chars() {
                assert!(!p.contains(ch), "ambiguous {ch} in {p}");
            }
        }
    }

    #[test]
    fn single_charset_works() {
        let opts = GeneratorOptions {
            length: 8,
            use_lower: true,
            use_upper: false,
            use_digits: false,
            use_symbols: false,
            exclude_ambiguous: false,
        };
        let p = generate_password(&opts).unwrap();
        assert_eq!(p.chars().count(), 8);
        assert!(p.chars().all(|c| c.is_ascii_lowercase()));
    }

    #[test]
    fn rejects_no_charset() {
        let opts = GeneratorOptions {
            use_lower: false,
            use_upper: false,
            use_digits: false,
            use_symbols: false,
            ..OPTS
        };
        assert!(matches!(generate_password(&opts), Err(Error::Validation(_))));
    }

    #[test]
    fn rejects_length_too_short() {
        let opts = GeneratorOptions { length: 2, ..OPTS }; // 4 个字符集被选中
        assert!(matches!(generate_password(&opts), Err(Error::Validation(_))));
    }

    #[test]
    fn rejects_length_over_256() {
        let opts = GeneratorOptions { length: 257, ..OPTS };
        assert!(matches!(generate_password(&opts), Err(Error::Validation(_))));
    }
}
