"use client"

import Link from "next/link"
import { useCallback } from "react"
import { ArrowUpRight, Mail, Phone } from "lucide-react"

import { PillBase } from "@/components/ui/3d-adaptive-navigation-bar"
import { ShaderAnimation } from "@/components/ui/shader-lines"
import RotatingEarth from "@/components/ui/wireframe-dotted-globe"
// Replace animated H2 titles with particle headings
import { ParticleHeading } from "@/components/ui/particle-heading"
// import { LiquidButton, MetalButton } from "@/components/ui/liquid-glass-button"
import { RainbowButton } from "@/components/ui/rainbow-button"
import { Timeline } from "@/components/ui/timeline"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
// WebGLShader is now provided globally in layout

const services = [
  {
    title: "SaaS sob medida",
    description:
      "Arquitetamos plataformas que nascem escaláveis, com observabilidade e feature flags prontos para squads globais.",
    detail: "12 plataformas lançadas desde 2022",
  },
  {
    title: "Produtos para corporações",
    description:
      "Criamos hubs digitais que conversam com legados complexos e traduzem processos em experiências intuitivas.",
    detail: "+48 integrações críticas mapeadas",
  },
  {
    title: "Interfaces operacionais",
    description:
      "Dashboards e command centers com métricas em tempo real, focados em tomada de decisão e automação.",
    detail: "SLAs visíveis em menos de 4 semanas",
  },
]

const differentiators = [
  {
    title: "Cell core team",
    copy: "Squad Orphta embarca com product strategist, tech partner e design lead para navegar do briefing ao rollout.",
  },
  {
    title: "Stack imersiva",
    copy: "Next.js, Edge runtimes e pipelines AI nativos para reduzir o lead time de insights a features.",
  },
  {
    title: "Governança viva",
    copy: "Roadmaps visuais, contratos modulares e dados compartilhados semanalmente para dar previsibilidade à diretoria.",
  },
]

const timelineData = [
  {
    title: "Descoberta e arquitetura",
    content: (
      <div className="glass-surface rounded-3xl p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Semana 0-4</p>
        <h4 className="mt-3 text-2xl font-semibold text-white">Blueprint vivo + mapa de riscos</h4>
        <p className="mt-2 text-base text-white/70">
          Entrevistas com squads, shadowing operacional e simulações técnicas que viram um war-room digital para stakeholders.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-white/60">
          <span className="rounded-full border border-white/20 px-3 py-1">Playbooks + wireflows</span>
          <span className="rounded-full border border-white/20 px-3 py-1">Roadmap de integrações</span>
        </div>
      </div>
    ),
  },
  {
    title: "Design e validação",
    content: (
      <div className="glass-surface rounded-3xl p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Semana 5-9</p>
        <h4 className="mt-3 text-2xl font-semibold text-white">Prototipagem com dados reais</h4>
        <p className="mt-2 text-base text-white/70">
          Motion, micro-interações e narrativa visual conectados ao branding do cliente + user tests guiados por product analytics.
        </p>
        <div className="mt-6 grid gap-3 text-xs text-white/70 sm:grid-cols-2">
          <div className="glass-surface rounded-2xl border border-white/10 p-3">Heatmaps + métricas de atenção</div>
          <div className="glass-surface rounded-2xl border border-white/10 p-3">Storyboards para C-level</div>
        </div>
      </div>
    ),
  },
  {
    title: "Entrega evolutiva",
    content: (
      <div className="glass-surface rounded-3xl p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Semana 10+</p>
        <h4 className="mt-3 text-2xl font-semibold text-white">Release train + observabilidade</h4>
        <p className="mt-2 text-base text-white/70">
          CICD com feature toggles, squads integrados e cockpit de rollout para acompanhar cada deploy com clareza.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-xs text-white/70">
          <div className="rounded-full border border-white/20 px-3 py-1">SRE + produto</div>
          <div className="rounded-full border border-white/20 px-3 py-1">Chapter de AI copilots</div>
          <div className="rounded-full border border-white/20 px-3 py-1">Runbooks compartilhados</div>
        </div>
      </div>
    ),
  },
]

const contactEntries = [
  {
    label: "Vamos conversar",
    value: "+55 11 99999-0000",
    href: "tel:+5511999990000",
    icon: Phone,
  },
  {
    label: "Enviar briefing",
    value: "hello@orphta.com",
    href: "mailto:hello@orphta.com",
    icon: Mail,
  },
]

const previousWorks = [
  { label: "Atlas Mining OS", href: "#" },
  { label: "Pulse Bank Platform", href: "#" },
  { label: "Korum Logistics Hub", href: "#" },
]

const heroMetrics = [
  { label: "Produtos lançados", value: "+32" },
  { label: "Integrações críticas", value: "58" },
  { label: "Países atendidos", value: "07" },
]

export default function Home() {
  const handleScrollToContact = useCallback(() => {
    const target = document.getElementById("contact")
    target?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  return (
    <main className="relative min-h-screen overflow-hidden pt-28">

      <header className="fixed inset-x-0 top-0 z-50 px-6 sm:px-10 lg:px-16">
        <div className="glass-surface flex flex-col gap-6 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">Orphta</p>
            <p className="text-sm text-white/70">Fábrica de softwares para times que não podem desacelerar.</p>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <PillBase />
          </div>
          <RainbowButton onClick={handleScrollToContact} className="whitespace-nowrap">
            Falar agora
          </RainbowButton>
        </div>
      </header>

      <section id="home" className="relative isolate flex min-h-screen flex-col gap-16 px-6 pb-24 pt-8 sm:px-10 lg:px-16 scroll-mt-28">
        <div className="glass-surface relative overflow-hidden rounded-[40px] p-0">
          <div className="pointer-events-none absolute inset-0 opacity-60 mix-blend-screen">
            <ShaderAnimation />
          </div>
          <div className="relative z-10 grid gap-10 p-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-8 lg:pr-4">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.4em] text-white/70">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_3px_rgba(16,185,129,0.45)]"></span>
              Disponível para novos projetos
            </div>
            <h1 className="text-4xl font-semibold leading-tight text-white md:text-6xl">
              Orphta é a fábrica de softwares que entrega produtos enterprise com estética de futuro e engenharia comprovada.
            </h1>
            <p className="text-lg text-white/70 md:w-4/5">
              Conectamos estratégia, design e engenharia em sprints que alinham diretoria, squads e usuários sem burocracia e sem hiato entre visão e execução.
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <RainbowButton className="rounded-full px-8 text-base font-semibold" onClick={handleScrollToContact}>
                Começar um projeto
              </RainbowButton>
              <button
                onClick={() => {
                  document.getElementById("problem")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }}
                className="group inline-flex items-center gap-2 text-sm font-semibold text-white/70"
              >
                Ver manifesto
                <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </button>
            </div>
            <div className="glass-surface grid gap-4 rounded-3xl p-4 sm:grid-cols-3">
              {heroMetrics.map((metric) => (
                <div key={metric.label} className="space-y-1">
                  <p className="text-3xl font-semibold text-white">{metric.value}</p>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-6">
            {differentiators.map((item) => (
              <div key={item.title} className="glass-surface rounded-3xl space-y-3 p-6 text-white">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">{item.title}</p>
                <p className="text-base text-white/80">{item.copy}</p>
              </div>
            ))}
          </div>
          </div>
        </div>
      </section>

      <section id="problem" className="relative z-10 px-6 pb-24 sm:px-10 lg:px-16 scroll-mt-28">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-4">
            <ParticleHeading text="O PROBLEMA" fontSize={96} />
            <p className="max-w-2xl text-base text-white/70">
              Empresas possuem metas agressivas, mas esbarram em integrações lentas, processos invisíveis e experiências que não traduzem o potencial do negócio. A Orphta entra como copiloto, simplificando decisões e acelerando entregas.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.4em] text-white/60">
            <span className="rounded-full border border-white/20 px-4 py-1">Discovery cirúrgico</span>
            <span className="rounded-full border border-white/20 px-4 py-1">Cultura builder</span>
          </div>
        </div>
        <div className="glass-surface-soft mt-8 rounded-[40px] p-10">
          <div className="grid gap-6 md:grid-cols-3">
            {services.map((service) => (
              <article key={service.title} className="glass-surface-transparent relative flex flex-col gap-6 rounded-3xl p-6">
                <div className="h-12 w-12 rounded-2xl border border-white/20 bg-transparent" />
                <div className="space-y-3">
                  <h3 className="text-2xl font-semibold text-white">{service.title}</h3>
                  <p className="text-sm text-white/70">{service.description}</p>
                </div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/40">{service.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="solution" className="relative z-10 px-6 pb-24 sm:px-10 lg:px-16 scroll-mt-28">
        <div className="space-y-6">
          <ParticleHeading text="COMO TRABALHAMOS" fontSize={96} />
          <p className="max-w-3xl text-base text-white/70">
            Operamos com células que combinam estratégia, produto, engenharia e motion design. Enquanto você mantém foco no core business, nós criamos, validamos e escalamos com transparência.
          </p>
        </div>
        <div className="glass-surface mt-12 rounded-[40px]">
          <Timeline
            data={timelineData}
            heading="Nossa linha de entrega"
            description="Cada fase mantém o mesmo squad e o mesmo contexto."
            className="!bg-transparent"
          />
        </div>
      </section>

      <section id="about" className="relative z-10 px-6 pb-24 sm:px-10 lg:px-16 scroll-mt-28">
        <div className="glass-surface-soft relative text-white overflow-visible rounded-none border-0 bg-transparent">
          <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 py-20 lg:grid lg:grid-cols-2 lg:items-center lg:py-24">
            <div className="order-2 flex items-center justify-center lg:order-1">
              <div className="relative aspect-square w-full max-w-[520px]">
                <RotatingEarth width={520} height={520} className="relative h-full w-full" />
              </div>
            </div>
            <div className="order-1 space-y-6 lg:order-2 lg:ml-auto lg:max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300/80">Fábrica global</p>
              <h2 className="text-3xl font-semibold leading-tight md:text-4xl lg:text-5xl">
                Orphta conecta times e produtos digitais ao redor do mundo.
              </h2>
              <p className="text-sm text-emerald-50/80 md:text-base">
                Somos um estúdio-tech baseado em São Paulo com operação distribuída na América Latina e parceiros na Europa. Traduzimos estratégia corporativa em produtos que escalam rápido, com governança viva e estética de futuro.
              </p>
              <ul className="space-y-2 text-sm text-emerald-100/80">
                <li>• Selecionamos poucos projetos por ciclo para garantir imersão total.</li>
                <li>• Acesso direto ao time core, rituais semanais e dashboards de adoção.</li>
                <li>• Arquiteturas desenhadas para crescer junto com seu roadmap.</li>
              </ul>
              <div className="flex flex-wrap gap-3 pt-4 text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                {previousWorks.map((work, index) => (
                  <Link
                    key={work.label}
                    href={work.href}
                    className={`rounded-full border px-4 py-2 ${
                      index === 0
                        ? "border-emerald-500/60 bg-emerald-500/10"
                        : index === 1
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-emerald-500/20"
                    }`}
                  >
                    {work.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="relative z-10 px-6 pb-24 sm:px-10 lg:px-16 scroll-mt-28">
        <div className="space-y-4">
          <ParticleHeading text="CONTATO" fontSize={96} />
          <p className="max-w-xl text-base text-white/70">
            Conte o problema, o contexto e a janela de entrega. Respondemos em até 48h com um plano inicial e referências.
          </p>
        </div>
        <div className="glass-surface mt-8 grid gap-12 rounded-[40px] p-8 lg:grid-cols-[0.7fr_0.3fr]">
          <div>
            <form className="space-y-6">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input id="name" placeholder="Como devemos te chamar?" className="mt-2" />
              </div>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" placeholder="nome@empresa.com" className="mt-2" />
              </div>
              <div>
                <Label htmlFor="context">Contexto</Label>
                <Textarea id="context" placeholder="Conte sobre desafios, metas e stakeholders." className="mt-2" />
              </div>
              <RainbowButton className="rounded-full px-10 text-base font-semibold">
                Enviar briefing
              </RainbowButton>
            </form>
          </div>
          <div className="glass-surface rounded-3xl p-6 text-white">
            {contactEntries.map((entry) => (
              <Link key={entry.label} href={entry.href} className="flex items-start gap-4 rounded-2xl border border-white/10 p-4 transition hover:border-white/40">
                <entry.icon className="mt-1 size-5" />
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-white/50">{entry.label}</p>
                  <p className="text-lg font-semibold">{entry.value}</p>
                </div>
              </Link>
            ))}
            <p className="text-sm text-white/70">
              Escritório-base em São Paulo com operações remotas sincronizadas com fusos das Américas e Europa.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
