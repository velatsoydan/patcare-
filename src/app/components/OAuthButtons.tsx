import React, { useState } from "react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { googleLogin } from "../../services/authService";
import { Loader2, AlertCircle, Info } from "lucide-react";

interface OAuthButtonsProps {
  onSuccess?: () => void;
  onError?: (errorMsg: string) => void;
}

export function OAuthButtonsContent({ onSuccess, onError }: OAuthButtonsProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [appleInfoToast, setAppleInfoToast] = useState<boolean>(false);

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      const msg = "Google doğrulama anahtarı (credential) alınamadı.";
      setErrorMessage(msg);
      onError?.(msg);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      // Send Google credential token to .NET Web API /api/auth/google
      await googleLogin({ idToken: credentialResponse.credential });
      onSuccess?.();
    } catch (err: any) {
      const msg = err.message || "Google ile giriş başarısız oldu. Lütfen backend bağlantınızı kontrol edin.";
      setErrorMessage(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setAppleInfoToast(true);
    setTimeout(() => setAppleInfoToast(false), 4000);
  };

  return (
    <div className="w-full space-y-3">
      {/* Error Message */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-400 text-xs animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Apple Info Toast Notification */}
      {appleInfoToast && (
        <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between text-sky-300 text-xs animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-400 flex-shrink-0" />
            <span>Apple ile giriş iOS sürümüyle birlikte yakında eklenecektir.</span>
          </div>
        </div>
      )}

      {/* Google Login Component */}
      <div className="w-full flex justify-center relative">
        {loading ? (
          <button
            disabled
            className="w-full py-3 px-4 rounded-full bg-white/5 border border-white/10 text-white text-sm font-medium flex items-center justify-center gap-2"
          >
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Google ile giriş yapılıyor...</span>
          </button>
        ) : (
          <div className="w-full flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => {
                const msg = "Google yetkilendirmesi gerçekleştirilemedi. Lütfen Google Cloud Console origin ayarlarınızı (http://localhost:5173) kontrol ediniz.";
                setErrorMessage(msg);
                onError?.(msg);
              }}
              useOneTap={false}
              theme="filled_black"
              shape="pill"
              text="continue_with"
              width="350"
            />
          </div>
        )}
      </div>

      {/* Apple Sign-In Button (Disabled state + Info notice on interaction) */}
      <div className="w-full relative group">
        <button
          type="button"
          onClick={handleAppleClick}
          className="w-full py-2.5 px-4 rounded-full bg-slate-950/60 border border-slate-800 text-slate-400 text-sm font-medium flex items-center justify-center gap-2 opacity-70 cursor-not-allowed hover:border-sky-500/40 hover:text-slate-300 transition-all shadow-md"
        >
          <svg className="w-4 h-4 fill-current mb-0.5" viewBox="0 0 170 170">
            <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.34.13-9.16-1.9-14.46-6.1-3.48-2.8-7.44-7.61-11.89-14.42-7.83-11.97-13.84-24.96-18.03-38.97-4.19-14.01-6.29-27.42-6.29-40.23 0-15.67 3.97-28.79 11.91-39.37 7.94-10.58 17.8-15.98 29.58-16.2 5.01 0 10.41 1.25 16.2 3.75 5.79 2.5 9.77 3.75 11.94 3.75 1.96 0 6.04-1.25 12.24-3.75 6.2-2.5 11.41-3.64 15.63-3.43 11.09.54 20.31 4.57 27.67 12.1-16.75 10.12-24.9 23.93-24.45 41.44.44 14.13 5.99 25.88 16.64 35.24 4.79 4.24 10.23 7.39 16.32 9.46-1.31 3.81-2.94 7.62-4.9 11.44zM119.22 31.08c0-7.39 2.72-14.46 8.16-21.2 5.44-6.75 12.29-10.88 20.56-12.38.11.98.16 1.96.16 2.94 0 7.29-2.78 14.47-8.34 21.54-5.55 7.07-12.4 11.21-20.54 12.41-.11-.98-.16-1.96-.16-2.94z"/>
          </svg>
          <span>Apple ile devam et</span>
          <span className="text-[10px] bg-slate-800 text-sky-400 font-semibold px-2 py-0.5 rounded-full border border-sky-500/30 ml-auto">
            Yakında
          </span>
        </button>
      </div>
    </div>
  );
}

export function OAuthButtons(props: OAuthButtonsProps) {
  const env = (import.meta as { env?: Record<string, string> }).env;
  const googleClientId = env?.VITE_GOOGLE_CLIENT_ID || "";

  if (!googleClientId) {
    return (
      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>VITE_GOOGLE_CLIENT_ID .env.local dosyasında tanımlı değil.</span>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <OAuthButtonsContent {...props} />
    </GoogleOAuthProvider>
  );
}
