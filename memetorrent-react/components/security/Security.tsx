export default function Security() {
  return (
    <section id="security" className="py-20 border-t border-white/10">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <div className="text-emerald-400 text-xs tracking-[4px]">SECURITY IS NON-NEGOTIABLE</div>
        <h2 className="text-4xl font-semibold tracking-tight mt-3">Built for people who actually care about self-custody.</h2>

        <div className="grid sm:grid-cols-3 gap-6 mt-12 text-left">
          {[
            ['Client-side only keys', 'Mnemonics are generated in your browser. The only thing ever stored encrypted is the seed using AES-GCM + 210k PBKDF2. Password never leaves your machine.'],
            ['Signing where it belongs', 'Every transaction signature is produced locally using the same ed25519 scheme as the MT node. The node only receives a signature + public fields.'],
            ['Future-proof social layer', 'We will ship our own lightweight APIs for Google, Microsoft, and Meta sign-in. These will only ever be used for username association or optional recovery — keys stay yours.'],
          ].map(([title, body], idx) => (
            <div key={idx} className="rounded-2xl border border-white/10 p-6 bg-white/[0.01]">
              <div className="font-semibold mb-3">{title}</div>
              <p className="text-sm opacity-70 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        <p className="text-xs mt-12 opacity-50 max-w-md mx-auto">No seed phrases in any database. No private keys on any server. Ever. This is how you build the best wallet.</p>
      </div>
    </section>
  );
}
