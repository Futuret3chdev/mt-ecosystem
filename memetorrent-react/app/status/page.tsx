'use client';

import servicesData from './services.json';

export default function StatusPage() {
  const { services, overall_status, generated_at } = servicesData;

  const totalServices = services.length;
  const operational = services.filter(s => s.status === 'online').length;
  const issues = totalServices - operational;

  return (
    <main className="min-h-screen bg-[#060a12] text-[#eef6ff]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header matching external status design */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 text-[#35e0ff] text-xs tracking-[2px] mb-2">
            ECOSYSTEM COMMAND CENTER
          </div>
          <h1 className="text-4xl font-semibold tracking-[-1.5px]">MT Ecosystem Status</h1>
          <p className="text-[#97a7c6] mt-1">Live health of core public services • Last checked {new Date(generated_at).toLocaleString()}</p>
        </div>

        {/* Summary cards - important stats from the status feed */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="rounded-2xl border border-white/10 bg-[#0f1728] p-6">
            <div className="text-[#97a7c6] text-xs tracking-widest">TOTAL SERVICES</div>
            <div className="text-5xl font-semibold mt-2 text-[#19d37e]">{totalServices}</div>
            <div className="text-sm text-[#97a7c6] mt-1">Tracked live services in the current public feed.</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0f1728] p-6">
            <div className="text-[#97a7c6] text-xs tracking-widest">OPERATIONAL</div>
            <div className="text-5xl font-semibold mt-2 text-[#19d37e]">{operational}</div>
            <div className="text-sm text-[#97a7c6] mt-1">Services currently detected as active.</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0f1728] p-6">
            <div className="text-[#97a7c6] text-xs tracking-widest">ISSUES DETECTED</div>
            <div className="text-5xl font-semibold mt-2 text-[#ff5d5d]">{issues}</div>
            <div className="text-sm text-[#97a7c6] mt-1">Services requiring attention or currently offline.</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0f1728] p-6">
            <div className="text-[#97a7c6] text-xs tracking-widest">ECOSYSTEM MODULES</div>
            <div className="text-5xl font-semibold mt-2 text-[#4da3ff]">12</div>
            <div className="text-sm text-[#97a7c6] mt-1">Core public ecosystem categories and rollout tracks.</div>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <div className="text-sm font-medium">Live Service Health</div>
          <div className="text-xs px-3 py-1 rounded-full bg-[#19d37e]/10 text-[#19d37e] border border-[#19d37e]/30">
            {operational} operational • {issues} issues detected
          </div>
        </div>

        {/* Services list - the 7 core ones from the feed */}
        <div className="grid md:grid-cols-2 gap-4">
          {services.map((service: any) => (
            <div key={service.key} className="rounded-2xl border border-white/10 bg-[#0f1728] p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-lg">{service.name}</div>
                  <div className="text-xs text-[#97a7c6] mt-0.5">{service.public_status}</div>
                </div>
                <div className="px-3 py-1 text-xs rounded-full border bg-[#19d37e]/10 text-[#19d37e] border-[#19d37e]/30">
                  {service.status === 'online' ? 'Operational' : 'Issue'}
                </div>
              </div>

              <div className="mt-4 text-sm text-[#97a7c6]">
                {service.details?.running ? 'Active and responding normally' : 'Requires attention'}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-4 text-xs">
                <div className="text-[#97a7c6]">Instances</div>
                <div>{service.details?.count || 1}</div>

                <div className="text-[#97a7c6] mt-1">Status</div>
                <div className="mt-1 text-[#19d37e]">{service.public_status}</div>

                <div className="text-[#97a7c6] mt-1">Service Key</div>
                <div className="mt-1 font-mono text-[10px]">{service.key}</div>

                <div className="text-[#97a7c6] mt-1">Checked At</div>
                <div className="mt-1 text-[10px]">{new Date(service.checked_at).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-[10px] text-white/40">
          Data sourced from live public feed. For full historical updates, media, and news see the links in the footer.
        </div>
      </div>
    </main>
  );
}
