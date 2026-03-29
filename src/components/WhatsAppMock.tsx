"use client";

import { motion } from "framer-motion";

interface WhatsAppMockProps {
  amount: number;
}

export default function WhatsAppMock({ amount }: WhatsAppMockProps) {
  return (
    <motion.div
      className="absolute bottom-8 right-6 z-50 w-[310px]"
      initial={{ x: 100, opacity: 0, scale: 0.95 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 100, opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", damping: 22, stiffness: 200 }}
    >
      <div className="bg-[#1F2C33] rounded-2xl shadow-2xl overflow-hidden border border-white/5">
        {/* WhatsApp header */}
        <div className="bg-whatsapp-green/90 px-4 py-2.5 flex items-center gap-2.5">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.637l4.685-1.228A11.935 11.935 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.239 0-4.332-.726-6.021-1.956l-.42-.311-2.776.728.742-2.71-.341-.543A9.963 9.963 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
          </svg>
          <span className="text-white text-sm font-medium">WhatsApp</span>
          <span className="text-white/60 text-xs ml-auto">now</span>
        </div>

        {/* Message body */}
        <div className="px-4 py-3">
          <p className="text-white/90 text-sm font-medium mb-1">Aklima</p>
          <p className="text-white/70 text-sm leading-relaxed">
            Frost event detected on your field.{" "}
            <span className="text-whatsapp-green font-mono font-bold">
              &euro;{amount.toFixed(2)}
            </span>{" "}
            has been sent to your account.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
