use std::sync::atomic::{AtomicI32, Ordering};

static SIGNAL: AtomicI32 = AtomicI32::new(0);

pub fn signal() -> i32 {
    SIGNAL.load(Ordering::SeqCst)
}

#[cfg(unix)]
extern "C" fn handle_signal(value: i32) {
    SIGNAL.store(value, Ordering::SeqCst);
}

pub fn install() {
    #[cfg(unix)]
    unsafe {
        unsafe extern "C" {
            fn signal(number: i32, handler: extern "C" fn(i32)) -> usize;
        }
        signal(2, handle_signal);
        signal(15, handle_signal);
    }
}
