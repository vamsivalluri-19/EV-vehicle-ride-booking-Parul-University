import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, User, ShieldAlert, Truck, Download, Phone, ShieldCheck, Check } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || `http://${window.location.hostname}:5000`;

export default function Login() {
  const [role, setRole] = useState('user');
  const [userId, setUserId] = useState('1');
  const [userName, setUserName] = useState('');
  const [userMobile, setUserMobile] = useState('');
  const [drivers, setDrivers] = useState([]);
  
  // PWA installation states
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // New User Verification (OTP) States
  const [verificationStep, setVerificationStep] = useState('NONE'); // NONE, OTP_SEND, OTP_VERIFY
  const [pendingVerificationUser, setPendingVerificationUser] = useState(null);
  const [verificationMobile, setVerificationMobile] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const [simulatedOtpCode, setSimulatedOtpCode] = useState('');
  const otpRefs = [useRef(), useRef(), useRef(), useRef()];

  const navigate = useNavigate();

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/drivers`);
        const data = await res.json();
        setDrivers(data);
      } catch(e) { console.error(e) }
    };
    fetchDrivers();

    // Check if already installed & running in standalone mode
    const standalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    if (!standalone) {
      // Detect iOS device
      const userAgent = window.navigator.userAgent.toLowerCase();
      const ios = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(ios);

      // Handle beforeinstallprompt event (Android/Chrome)
      const handleBeforeInstallPrompt = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowInstallBtn(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, id: userId, name: userName, mobile: userMobile })
      });
      const data = await res.json();
      if (data.success) {
        const userObj = data.user;
        
        if (role === 'user' && !userObj.verified) {
          // Prompt OTP verification for unverified users
          setPendingVerificationUser(userObj);
          setVerificationMobile(userObj.mobile);
          setVerificationStep('OTP_SEND');
        } else {
          // Pre-verified user, admin, or driver
          localStorage.setItem('user', JSON.stringify(userObj));
          if (role === 'admin') navigate('/admin');
          else if (role === 'driver') navigate('/driver');
          else navigate('/user');
        }
      } else {
        alert('Login failed: Invalid ID for selected role');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to server');
    }
  };

  // Google Login flow (Simulated Popup for Local/Network testing)
  const handleGoogleLoginClick = () => {
    const email = prompt("Enter Google Account Email to simulate Sign-In:", "student.parul@gmail.com");
    if (!email) return;
    const name = prompt("Enter Google Account Name:", "Aarav Sharma");
    if (!name) return;

    processGoogleLogin({ email, name });
  };

  const processGoogleLogin = async (profile) => {
     try {
       const res = await fetch(`${API_BASE}/api/auth/google-login`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email: profile.email, name: profile.name })
       });
       const data = await res.json();
       if (data.success) {
         const userObj = data.user;
         setPendingVerificationUser(userObj);
         setVerificationMobile(userObj.mobile || '');
         
         if (!userObj.verified) {
           setVerificationStep('OTP_SEND');
         } else {
           localStorage.setItem('user', JSON.stringify(userObj));
           navigate('/user');
         }
       }
     } catch (e) {
       console.error("Google login request failed:", e);
       alert("Error connecting to backend for Google sign-in");
     }
  };

  // OTP Sending request
  const handleSendOtp = async (e) => {
     e.preventDefault();
     if (!verificationMobile || verificationMobile.length !== 13) {
        alert("Please enter a valid 13-digit mobile number!");
        return;
     }

     try {
        const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ userId: pendingVerificationUser.id, mobile: verificationMobile })
        });
        const data = await res.json();
        if (data.success) {
           setSimulatedOtpCode(data.code);
           setVerificationStep('OTP_VERIFY');
        } else {
           alert(data.message);
        }
     } catch(e) {
        alert("Failed to send verification code");
     }
  };

  // OTP Digits input handlers
  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.substring(value.length - 1);
    setOtpDigits(newDigits);

    // Auto-focus next input field
    if (value && index < 3) {
      otpRefs[index + 1].current.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // Backspace auto-focus previous field
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs[index - 1].current.focus();
    }
  };

  // OTP Verification request
  const handleVerifyOtp = async (e) => {
     e.preventDefault();
     const fullCode = otpDigits.join('');
     if (fullCode.length !== 4) {
        alert("Please enter all 4 verification digits!");
        return;
     }

     try {
        const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ userId: pendingVerificationUser.id, code: fullCode })
        });
        const data = await res.json();
        if (data.success) {
           // Complete profile activation & log user in
           localStorage.setItem('user', JSON.stringify(data.user));
           setVerificationStep('NONE');
           setPendingVerificationUser(null);
           setOtpDigits(['', '', '', '']);
           navigate('/user');
        } else {
           alert("Invalid code entered. Please try again.");
        }
     } catch(e) {
        alert("Verification failed");
     }
  };

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', position: 'relative', gap: '1.5rem' }}>

      {/* PWA INSTALL PROMPT */}
      {!isStandalone && showInstallBtn && verificationStep === 'NONE' && (
        <div className="pwa-promo-banner" style={{ maxWidth: '400px', width: '100%' }}>
          <div className="pwa-promo-text">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}><Download size={18}/> Get Mobile App</h4>
            <p style={{ margin: 0, marginTop: '0.2rem' }}>Install on your phone home screen for full EV transit experience</p>
          </div>
          <button className="pwa-install-btn" onClick={handleInstallClick}>Install</button>
        </div>
      )}

      {/* PWA IOS SAFARI POPUP GUIDE */}
      {!isStandalone && isIOS && verificationStep === 'NONE' && (
        <div className="ios-pwa-guide" style={{ maxWidth: '400px', width: '100%' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}><Download size={18}/> Install App on iOS</h4>
          <p style={{ margin: 0, marginTop: '0.25rem', fontSize: '0.85rem' }}>To install this app on your iPhone:</p>
          <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
            <li>Tap the Safari <strong>Share</strong> button (square with up arrow).</li>
            <li>Scroll down and select <strong>"Add to Home Screen"</strong>.</li>
          </ol>
        </div>
      )}

      {/* MAIN LOGIN CARD */}
      {verificationStep === 'NONE' ? (
        <div className="card glass-card" style={{ maxWidth: '400px', width: '100%', position: 'relative', zIndex: 10 }}>
          <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <LogIn style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
            System Login
          </h2>
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label>Select Role</label>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                <button type="button" className={'role-btn ' + (role === 'user' ? 'active' : '')} onClick={() => {setRole('user'); setUserId('1')}}><User size={20}/> User</button>
                <button type="button" className={'role-btn ' + (role === 'driver' ? 'active' : '')} onClick={() => {setRole('driver'); setUserId('1')}}><Truck size={20}/> Driver</button>
                <button type="button" className={'role-btn ' + (role === 'admin' ? 'active' : '')} onClick={() => {setRole('admin'); setUserId('2')}}><ShieldAlert size={20}/> Admin</button>
              </div>
            </div>
            <div className="input-group" style={{ marginBottom: '2rem' }}>
              <label>{role === 'user' ? 'Enter Credentials' : 'Select Account'}</label>
              {role === 'user' ? (
                <>
                  <input type="text" className="form-input" placeholder="Your Full Name" value={userName} onChange={e => setUserName(e.target.value)} required />
                  <input type="text" className="form-input" placeholder="13-Digit Mobile/Enrollment No" maxLength={13} minLength={13} pattern="\d{13}" value={userMobile} onChange={e => setUserMobile(e.target.value)} required style={{ marginTop: '1rem' }} />
                </>
              ) : (
                <select value={userId} onChange={(e) => setUserId(e.target.value)} required className="form-input">
                  {role === 'driver' && (
                    <>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>{d.name} (ID: {d.id})</option>
                      ))}
                    </>
                  )}
                  {role === 'admin' && (
                    <>
                      <option value="2">Bob Admin (ID: 2)</option>
                    </>
                  )}
                </select>
              )}
            </div>
            <button type="submit" className="btn">Sign In</button>
          </form>

          {/* GOOGLE SIGN IN BUTTON FOR PASSENGERS/STUDENTS */}
          {role === 'user' && (
            <div className="google-btn-container">
               <button type="button" className="google-sign-in-btn" onClick={handleGoogleLoginClick}>
                  <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google Logo" style={{ width: '18px', height: '18px' }} />
                  Continue with Google
               </button>
            </div>
          )}
        </div>
      ) : (
        /* NEW USER PROFILE & OTP VERIFICATION DIALOGS */
        <div className="card glass-card" style={{ maxWidth: '450px', width: '100%', position: 'relative', zIndex: 10, padding: '2rem' }}>
          
          {/* STEP 1: OTP SEND (Complete mobile enrollment details) */}
          {verificationStep === 'OTP_SEND' && (
            <div>
              <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Phone size={24} style={{ color: 'var(--primary-color)' }}/> Profile Verification
              </h2>
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.9rem', marginBottom: '2rem' }}>
                Please provide and verify your 13-digit mobile/enrollment number to link and activate your campus EV profile.
              </p>
              <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                 <div>
                   <label style={{ color: 'var(--text-secondary)' }}>Mobile / Enrollment No</label>
                   <input 
                     type="text" 
                     className="form-input" 
                     placeholder="e.g. 919876543210 (13 Digits)" 
                     maxLength={13} 
                     minLength={13} 
                     pattern="\d{13}" 
                     value={verificationMobile} 
                     onChange={e => setVerificationMobile(e.target.value)} 
                     required 
                     style={{ marginTop: '0.5rem' }}
                   />
                 </div>
                 <button type="submit" className="btn" style={{ padding: '1rem', fontSize: '1.1rem' }}>
                    Send Verification Code
                 </button>
                 <button type="button" className="btn outline" style={{ padding: '0.8rem' }} onClick={() => setVerificationStep('NONE')}>
                    Cancel
                 </button>
              </form>
            </div>
          )}

          {/* STEP 2: OTP VERIFY (OTP code key entry) */}
          {verificationStep === 'OTP_VERIFY' && (
            <div>
              <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={26} style={{ color: 'var(--primary-color)' }}/> Enter Code
              </h2>
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.9rem', marginBottom: '1rem' }}>
                We've sent a simulated SMS verification code to your mobile number <strong>{verificationMobile}</strong>.
              </p>

              {/* SIMULATED TOAST MESSAGE SHOWING SENT CODE FOR TESTING */}
              {simulatedOtpCode && (
                <div className="sms-toast">
                  💬 <strong>SMS SIMULATION</strong><br/>
                  Your activation code is: <strong style={{ color: '#10b981' }}>{simulatedOtpCode}</strong>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
                 <div className="otp-container">
                   {otpDigits.map((digit, idx) => (
                     <input
                       key={`otp-${idx}`}
                       ref={otpRefs[idx]}
                       type="text"
                       className="otp-input"
                       maxLength={1}
                       value={digit}
                       onChange={e => handleOtpChange(idx, e.target.value)}
                       onKeyDown={e => handleOtpKeyDown(idx, e)}
                       required
                       autoFocus={idx === 0}
                     />
                   ))}
                 </div>
                 <button type="submit" className="btn" style={{ padding: '1rem', fontSize: '1.1rem', display: 'flex', gap: '0.5rem' }}>
                    <Check size={20}/> Verify & Activate Profile
                 </button>
                 <button type="button" className="btn outline" style={{ padding: '0.8rem' }} onClick={() => setVerificationStep('OTP_SEND')}>
                    Back
                 </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
