/* Formulários do site Umbaúba. Envia ao Worker; se falhar, leva o visitante ao WhatsApp. */
(function () {
  var API = "https://umbauba-respostas.umbaubadigital.workers.dev";
  var WA = "5511960218383";
  var d = document;
  function $(id) { return d.getElementById(id); }
  function wa(texto) { return "https://wa.me/" + WA + "?text=" + encodeURIComponent(texto); }
  function evento(n) { try { if (window.dataLayer) dataLayer.push({ event: n, pagina: location.pathname }); } catch (e) {} }
  function digitos(s) { return String(s || "").replace(/\D/g, ""); }
  function marcar(el, ruim) { if (el) el.setAttribute("aria-invalid", ruim ? "true" : "false"); }
  function valor(f, n) { var el = f.elements[n]; return el ? String(el.value || "").trim() : ""; }

  async function enviar(rota, corpo) {
    var r = await fetch(API + rota, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
    var j = {};
    try { j = await r.json(); } catch (e) {}
    return { ok: r.ok && j.ok, status: r.status, dados: j };
  }

  /* ---------- serviços: os blocos abrem janelas com os serviços da Central ---------- */
  d.querySelectorAll("[data-grupo]").forEach(function (el) {
    var g = el.getAttribute("data-grupo"), dl = $("dlg-" + g);
    if (!dl) return;
    function abrirGrupo(e) {
      if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault(); evento("abre_servico_" + g);
      if (typeof dl.showModal === "function") dl.showModal(); else location.hash = "#contato";
    }
    el.addEventListener("click", abrirGrupo); el.addEventListener("keydown", abrirGrupo);
  });
  d.querySelectorAll(".dlg-serv").forEach(function (dl) {
    dl.querySelectorAll("[data-fechar]").forEach(function (b) { b.addEventListener("click", function () { dl.close(); }); });
    dl.addEventListener("click", function (e) { if (e.target === dl) dl.close(); });
  });
  /* ---------- diagnóstico (janela na página inicial) ---------- */
  var dlg = $("dlg-diag");
  if ($("f-diag")) {
    var f = $("f-diag"), okbox = $("ok-diag"), erro = $("erro-diag"), btn = $("env-diag");
    var abrir = function () {
      evento("clique_diagnostico");
      d.querySelectorAll(".dlg-serv[open]").forEach(function (x) { x.close(); });
      if (typeof dlg.showModal === "function") { dlg.showModal(); }
      else { location.href = wa("Olá, Bruno! Quero pedir o diagnóstico de Instagram e site."); }
    };
    if (dlg) {
      d.querySelectorAll("[data-diag]").forEach(function (b) { b.addEventListener("click", abrir); });
      dlg.querySelectorAll("[data-fechar]").forEach(function (b) { b.addEventListener("click", function () { dlg.close(); }); });
      dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    }

    f.addEventListener("submit", async function (e) {
      e.preventDefault();
      erro.hidden = true;
      var dados = {
        nome: valor(f, "nome"), contato: valor(f, "contato"), perfil: valor(f, "perfil"),
        segmento: valor(f, "segmento"), mensagem: valor(f, "mensagem"),
        aceite: f.elements.aceite.checked, empresa_site: valor(f, "empresa_site")
      };
      var ruim = [];
      if (!dados.nome) ruim.push("nome");
      if (digitos(dados.contato).length < 10) ruim.push("contato");
      if (!dados.perfil) ruim.push("perfil");
      ["nome", "contato", "perfil"].forEach(function (n) { marcar(f.elements[n], ruim.indexOf(n) >= 0); });
      if (ruim.length) { erro.textContent = "Confira os campos marcados: nome, WhatsApp com DDD e o @ ou site."; erro.hidden = false; return; }
      if (!dados.aceite) { erro.textContent = "Para enviar, marque a concordância com o uso dos dados."; erro.hidden = false; return; }
      btn.disabled = true; btn.firstChild.textContent = "Enviando… ";
      var texto = "Olá, Bruno! Pedi o diagnóstico pelo site. Meu perfil: " + dados.perfil + ".";
      try {
        var r = await enviar("/diagnostico", dados);
        if (!r.ok) throw r;
        evento("envio_diagnostico");
        $("prot-diag").textContent = r.dados.protocolo || "";
        $("wa-diag").href = wa(texto + " Protocolo " + (r.dados.protocolo || "") + ".");
        f.hidden = true; okbox.hidden = false;
      } catch (r) {
        var msg = r && r.status === 429 ? "Você acabou de enviar um pedido. Aguarde um minuto ou fale direto pelo WhatsApp."
                                        : "Não conseguimos enviar agora. Você pode falar direto pelo WhatsApp.";
        erro.innerHTML = "";
        erro.appendChild(d.createTextNode(msg + " "));
        var a = d.createElement("a"); a.href = wa(texto + " Sou " + dados.nome + ", WhatsApp " + dados.contato + "."); a.target = "_blank"; a.rel = "noopener"; a.textContent = "Abrir o WhatsApp";
        erro.appendChild(a); erro.hidden = false;
        btn.disabled = false; btn.firstChild.textContent = "Enviar pedido ";
      }
    });
  }

  /* ---------- área do cliente (página /cliente/) ---------- */
  var fl = $("f-login");
  if (fl) {
    var sessao = "", clienteId = "", estado = null;
    var sLogin = $("s-login"), sArea = $("s-area");
    var erroLogin = $("erro-login"), btnLogin = $("env-login");
    var fc = $("f-cliente"), errc = $("erro-cliente"), okc = $("ok-ped"), btc = $("env-cliente");
    var CLASSE = { "Recebido": "st-recebido", "Em produção": "st-producao", "Entregue": "st-entregue", "Orçamento enviado": "st-aguarda", "Aguardando você": "st-aguarda", "Orçamento aprovado": "st-producao", "Orçamento recusado": "st-recebido" };
    var TZ = "America/Sao_Paulo";
    // modelos que contam no pacote do mês (os outros tipos, como ajuste ou dúvida, não contam)
    var CAT = { "Post": "posts", "Carrossel": "posts", "Post ou carrossel": "posts", "Reel": "reels", "Story": "stories" };
    var ROTULO = { posts: "Posts e carrosséis", reels: "Reels", stories: "Stories" };
    // serviços cobrados à parte (não entram no pacote mensal), como na Central: edição de Reels é por vídeo
    var AVULSO = { "Edição de Reel (vídeo gravado por você)": "A edição de Reels é um serviço avulso, por vídeo: o Bruno combina com você antes de começar." };
    var ORDEM = ["posts", "reels", "stories"];

    /* menu da área (verde, em vidro): Início, Aprovações, Solicitações, Arquivos, Resultados. "Novo pedido" é uma tela dentro de Solicitações */
    var ABAS = ["inicio", "apr", "ped", "novo", "arq", "res"], MENU = ["inicio", "apr", "ped", "arq", "res"], DONO = { novo: "ped" };
    function ir(aba, foco) {
      ABAS.forEach(function (a) { $("p-" + a).hidden = a !== aba; });
      var ativo = DONO[aba] || aba;
      MENU.forEach(function (m) {
        var t = $("t-" + m), sel = m === ativo;
        t.setAttribute("aria-selected", sel ? "true" : "false"); t.tabIndex = sel ? 0 : -1;
        if (sel && foco) t.focus();
      });
    }
    MENU.forEach(function (a, i) {
      var t = $("t-" + a);
      t.addEventListener("click", function () { if (a !== "ped") okc.hidden = true; ir(a); });
      t.addEventListener("keydown", function (e) {
        var k = (e.key === "ArrowRight" || e.key === "ArrowDown") ? 1 : (e.key === "ArrowLeft" || e.key === "ArrowUp") ? -1 : 0;
        if (k) { e.preventDefault(); ir(MENU[(i + k + MENU.length) % MENU.length], true); }
      });
    });
    $("nova-sol").addEventListener("click", function () { okc.hidden = true; ir("novo"); });
    $("voltar-ped").addEventListener("click", function () { ir("ped"); });
    function contador(id, n) { var c = $(id); c.textContent = n; c.hidden = !n; }

    function chaveMes(data) { return new Date(data).toLocaleDateString("en-CA", { timeZone: TZ }).slice(0, 7); }
    function dataHoraBR(iso) {
      try { return new Date(iso).toLocaleString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(",", " às"); }
      catch (e) { return ""; }
    }
    function prazoBR(p) { if (!p) return ""; var x = String(p).split("-"); return x.length === 3 ? x[2] + "/" + x[1] + "/" + x[0] : p; }
    function nomeMes() { return new Date().toLocaleDateString("pt-BR", { timeZone: TZ, month: "long", year: "numeric" }); }

    /* quantas peças já foram pedidas neste mês, por grupo e por modelo */
    function usoDoMes() {
      var agora = chaveMes(new Date().toISOString()), u = { grupos: { posts: 0, reels: 0, stories: 0 }, modelos: {} };
      ((estado && estado.pedidos) || []).forEach(function (p) {
        var cat = CAT[p.tipo];
        if (!cat || chaveMes(p.recebidoEm) !== agora) return;
        var q = p.quantidade || 1;
        u.grupos[cat] += q; u.modelos[p.tipo] = (u.modelos[p.tipo] || 0) + q;
      });
      return u;
    }
    function limites() { return (estado && estado.limites) || {}; }

    function desenharUso(el) {
      el.innerHTML = "";
      var u = usoDoMes(), lim = limites();
      var h = d.createElement("h3"); h.textContent = "Peças do mês de " + nomeMes(); el.appendChild(h);
      if (lim.contrato) { var ct = d.createElement("p"); ct.className = "fnota"; ct.textContent = "Seu contrato: " + lim.contrato; el.appendChild(ct); }
      var temLimite = ORDEM.some(function (c) { return lim[c] > 0; });
      ORDEM.forEach(function (c) {
        if (!(lim[c] > 0) && !u.grupos[c]) return;
        var linha = d.createElement("div"); linha.className = "uso-linha";
        var rot = d.createElement("span"); rot.textContent = ROTULO[c];
        var num = d.createElement("b"); num.textContent = lim[c] > 0 ? u.grupos[c] + " de " + lim[c] : String(u.grupos[c]);
        linha.appendChild(rot); linha.appendChild(num); el.appendChild(linha);
        if (lim[c] > 0) {
          var barra = d.createElement("div"); barra.className = "barra";
          var i = d.createElement("i"); i.style.width = Math.min(100, Math.round(u.grupos[c] / lim[c] * 100)) + "%";
          if (u.grupos[c] > lim[c]) i.className = "estourou";
          barra.appendChild(i); el.appendChild(barra);
        }
      });
      var mods = Object.keys(u.modelos);
      if (mods.length) {
        var ch = d.createElement("div"); ch.className = "modelos";
        mods.forEach(function (m) { var s = d.createElement("span"); s.textContent = m + " · " + u.modelos[m]; ch.appendChild(s); });
        el.appendChild(ch);
      } else {
        var n = d.createElement("p"); n.className = "vazio"; n.textContent = "Nenhuma peça pedida neste mês ainda."; el.appendChild(n);
      }
      if (!temLimite) {
        var q = d.createElement("p"); q.className = "fnota";
        q.textContent = lim.definido ? "O seu contrato não inclui um pacote mensal de peças. Pedidos de peças são avulsos: o Bruno confirma e combina com você antes de começar."
                                     : "O seu pacote mensal ainda não foi definido aqui. O Bruno combina os limites com você.";
        el.appendChild(q);
      }
      if (ORDEM.some(function (c) { return lim[c] > 0 && u.grupos[c] > lim[c]; })) {
        var a = d.createElement("p"); a.className = "erro"; a.textContent = "Você passou do pacote deste mês. O Bruno vai combinar com você como seguir."; el.appendChild(a);
      }
    }

    /* aviso no formulário, antes de enviar */
    function avisoPacote() {
      var av = $("aviso-pacote"); av.hidden = true; av.className = "ok-linha";
      var tipo = valor(fc, "tipo"), cat = CAT[tipo], lim = limites();
      if (AVULSO[tipo]) { av.className = "ok-linha"; av.textContent = AVULSO[tipo]; av.hidden = false; return; }
      if (cat && lim.definido && !(lim[cat] > 0)) { av.textContent = "Este modelo não está no seu pacote: será tratado como pedido avulso. O Bruno confirma e combina com você antes de começar."; av.hidden = false; return; }
      if (!cat || !(lim[cat] > 0)) return;
      var q = Math.max(1, parseInt(valor(fc, "quantidade"), 10) || 1), usado = usoDoMes().grupos[cat], depois = usado + q;
      if (depois > lim[cat]) {
        av.className = "erro"; av.textContent = "Com este pedido você vai a " + depois + " de " + lim[cat] + " (" + ROTULO[cat].toLowerCase() + ") do mês. Pode enviar: o Bruno confirma com você antes de começar.";
      } else {
        av.textContent = "Você já pediu " + usado + " de " + lim[cat] + " " + ROTULO[cat].toLowerCase() + " neste mês. Com este pedido serão " + depois + ".";
      }
      av.hidden = false;
    }
    ["tipo", "quantidade"].forEach(function (n) { fc.elements[n].addEventListener("input", avisoPacote); fc.elements[n].addEventListener("change", avisoPacote); });

    function desenhar() {
      var dados = estado;
      $("nome-cliente").textContent = dados.cliente || "";
      contador("cont-ped", (dados.pedidos || []).length);
      contador("cont-arq", (dados.arquivos || []).length);
      desenharUso($("uso-ped")); desenharUso($("uso-novo"));
      var ul = $("lista-ped"); ul.innerHTML = "";
      $("ped-vazio").hidden = !!(dados.pedidos && dados.pedidos.length);
      (dados.pedidos || []).forEach(function (p) {
        var li = d.createElement("li");
        var esq = d.createElement("div"); esq.className = "ped-esq";
        var titulo = d.createElement("b"); titulo.textContent = p.resumo || (p.descricao ? String(p.descricao).slice(0, 70) : p.tipo);
        var modelo = d.createElement("span"); modelo.className = "ped-modelo";
        var q = p.quantidade || 1; modelo.textContent = p.tipo + " · " + q + (q === 1 ? " peça" : " peças");
        var meta = d.createElement("small"); meta.className = "ped-meta";
        meta.textContent = "Enviado em " + dataHoraBR(p.recebidoEm) + (p.prazo ? " · para " + prazoBR(p.prazo) : "") + " · " + p.protocolo;
        esq.appendChild(titulo); esq.appendChild(modelo);
        if (p.descricao && p.resumo) {
          var det = d.createElement("details"); var sm = d.createElement("summary"); sm.textContent = "Ver detalhes";
          var tx = d.createElement("p"); tx.className = "ped-desc"; tx.textContent = p.descricao; det.appendChild(sm); det.appendChild(tx); esq.appendChild(det);
        }
        esq.appendChild(meta);
        if (p.nota) { var nt = d.createElement("p"); nt.className = "ped-nota"; nt.textContent = "Recado da Umbaúba: " + p.nota; esq.appendChild(nt); }
        if (p.status === "Orçamento enviado") {
          var ac = d.createElement("div"); ac.className = "ped-acoes";
          [["aprovar", "Aprovar orçamento", "btn-p"], ["recusar", "Recusar", "btn-s"]].forEach(function (x) {
            var b = d.createElement("button"); b.type = "button"; b.className = x[2]; b.textContent = x[1];
            b.addEventListener("click", async function () {
              ac.querySelectorAll("button").forEach(function (o) { o.disabled = true; });
              try {
                var r = await enviar("/portal/decidir", { sessao: sessao, cliente: clienteId, protocolo: p.protocolo, decisao: x[0] });
                if (!r.ok) throw r;
                await abrirCliente({ id: clienteId }); ir("ped");
              } catch (e) { ac.querySelectorAll("button").forEach(function (o) { o.disabled = false; }); mostrar(okc, "Não conseguimos registrar agora. Tente de novo em instantes."); }
            });
            ac.appendChild(b);
          });
          esq.appendChild(ac);
        }
        var chip = d.createElement("span"); chip.className = "chip ped-status " + (CLASSE[p.status] || "st-recebido"); chip.textContent = p.status || "Recebido";
        li.appendChild(esq); li.appendChild(chip);
        ul.appendChild(li);
      });
      var la = $("lista-arq"); la.innerHTML = "";
      $("arq-vazio").hidden = !!(dados.arquivos && dados.arquivos.length);
      (dados.arquivos || []).forEach(function (a) {
        var li = d.createElement("li");
        var link = d.createElement("a"); link.href = a.url; link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = a.nome;
        li.appendChild(link); la.appendChild(li);
      });
      // aprovações do mês
      var apr = dados.aprovacoes || [], pend = apr.filter(function (a) { return a.status !== "respondido"; });
      contador("cont-apr", pend.length);
      var lap = $("lista-apr"); lap.innerHTML = ""; $("apr-vazio").hidden = !!apr.length;
      apr.forEach(function (a) {
        var li = d.createElement("li"), esq = d.createElement("div"); esq.className = "ped-esq";
        var t = d.createElement("b"); t.textContent = a.titulo;
        var m = d.createElement("span"); m.className = "ped-modelo"; m.textContent = a.mes;
        var meta = d.createElement("small"); meta.className = "ped-meta";
        meta.textContent = a.status === "respondido" ? "Você respondeu em " + dataHoraBR(a.respondidoEm) + (a.situacao ? " · " + a.situacao : "") : "Aguardando a sua resposta";
        esq.appendChild(t); esq.appendChild(m); esq.appendChild(meta);
        var dir = d.createElement("div"); dir.className = "apr-dir";
        var chip = d.createElement("span"); chip.className = "chip " + (a.status === "respondido" ? "st-entregue" : "st-recebido"); chip.textContent = a.status === "respondido" ? "Respondido" : "Para aprovar";
        var ln = d.createElement("a"); ln.className = "btn-p"; ln.href = a.url; ln.target = "_blank"; ln.rel = "noopener noreferrer"; ln.textContent = a.status === "respondido" ? "Ver de novo" : "Abrir e aprovar";
        dir.appendChild(chip); dir.appendChild(ln); li.appendChild(esq); li.appendChild(dir); lap.appendChild(li);
      });
      // resultados (relatórios de métricas): só para quem tem o recurso no plano; os outros veem o aviso
      var lib = !!(dados.recursos && dados.recursos.resultados);
      $("res-conteudo").hidden = !lib; $("res-bloq").hidden = lib; $("cad-res").toggleAttribute("hidden", lib);
      var res = dados.resultados || [], lr = $("lista-res"); lr.innerHTML = ""; $("res-vazio").hidden = !!res.length;
      res.forEach(function (r) {
        var c = d.createElement("article"); c.className = "res-card";
        var mm = d.createElement("span"); mm.className = "ped-modelo"; mm.textContent = r.mes;
        var h = d.createElement("h3"); h.textContent = r.titulo; c.appendChild(mm); c.appendChild(h);
        if ((r.resumo || []).length) {
          var g = d.createElement("div"); g.className = "res-grade";
          r.resumo.forEach(function (x) { var i = d.createElement("div"), v = d.createElement("b"), l = d.createElement("span"); v.textContent = x.valor; l.textContent = x.rotulo + (x.nota ? " · " + x.nota : ""); i.appendChild(v); i.appendChild(l); g.appendChild(i); });
          c.appendChild(g);
        }
        if (r.url) { var a2 = d.createElement("a"); a2.className = "btn-p"; a2.href = r.url; a2.target = "_blank"; a2.rel = "noopener noreferrer"; a2.textContent = "Ver relatório completo"; c.appendChild(a2); }
        lr.appendChild(c);
      });
      // início: três cartões e o pacote do mês
      var ic = $("ini-cards"); ic.innerHTML = "";
      var andamento = (dados.pedidos || []).filter(function (p) { return p.status !== "Entregue"; }).length;
      function cartao(titulo, valor, texto, destino) {
        var b = d.createElement("button"); b.type = "button"; b.className = "ini-card";
        var s = d.createElement("span"); s.textContent = titulo; var v = d.createElement("b"); v.textContent = valor; var t = d.createElement("small"); t.textContent = texto;
        b.appendChild(s); b.appendChild(v); b.appendChild(t); b.addEventListener("click", function () { ir(destino); }); ic.appendChild(b);
      }
      cartao("Para aprovar", String(pend.length), pend.length ? (pend.length === 1 ? "conteúdo esperando você" : "conteúdos esperando você") : "nada pendente", "apr");
      cartao("Solicitações em andamento", String(andamento), andamento ? "a Umbaúba está cuidando" : "nenhuma por enquanto", "ped");
      var ur = lib ? res[0] : null; cartao("Último resultado", ur ? ur.mes : "—", ur ? ur.titulo : (lib ? "ainda sem relatório" : "não incluso no seu plano"), "res");
      desenharUso($("uso-inicio"));
      avisoPacote();
    }

    /* entrada por e-mail + código de 6 dígitos (o Worker confere e devolve uma sessão; nada de senha) */
    var fCod = $("f-codigo"), fEsc = $("f-escolha"), erroCod = $("erro-codigo"), avisoCod = $("aviso-codigo");
    var emailAtual = "";
    function guardar(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} }
    function ler(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
    function etapa(qual) {
      fl.hidden = qual !== "email"; fCod.hidden = qual !== "codigo"; fEsc.hidden = qual !== "escolha";
      $("intro-login").hidden = qual !== "email";
      $("titulo-login").innerHTML = qual === "email" ? "Entre com o seu <em>e-mail</em>" : qual === "codigo" ? "Digite o <em>código</em>" : "Qual <em>empresa</em> você quer abrir?";
      var alvo = qual === "email" ? fl.elements.email : qual === "codigo" ? fCod.elements.codigo : null;
      if (alvo) alvo.focus();
    }
    function ocupado(btn, on, txtOn, txtOff) { btn.disabled = on; btn.firstChild.textContent = on ? txtOn : txtOff; }
    function mostrar(el, msg) { el.textContent = msg; el.hidden = false; }

    async function abrirCliente(c) {
      var r = await enviar("/portal/meu", { sessao: sessao, cliente: c.id });
      if (!r.ok) throw r;
      clienteId = c.id; guardar("ub-cliente", c.id);
      estado = r.dados;
      desenhar();
      sLogin.hidden = true; sArea.hidden = false;
      ir("inicio");
    }
    function escolher(lista, preferido) {
      var pref = lista.filter(function (c) { return c.id === preferido; })[0];
      if (lista.length === 1 || pref) return abrirCliente(pref || lista[0]);
      var box = $("lista-escolha"); box.textContent = "";
      lista.forEach(function (c) {
        var b = d.createElement("button"); b.type = "button"; b.className = "btn btn-linha"; b.textContent = c.nome;
        b.addEventListener("click", function () { abrirCliente(c).catch(function () { mostrar(erroLogin, "Não conseguimos abrir agora. Tente de novo."); etapa("email"); }); });
        box.appendChild(b);
      });
      etapa("escolha");
      return Promise.resolve();
    }
    async function pedirCodigo(email) {
      var r = await enviar("/auth/pedir", { email: email });
      if (!r.ok) throw r;
      emailAtual = email;
      mostrar(avisoCod, "Se este e-mail estiver cadastrado, enviamos um código para " + email + ". Pode levar um minuto. Olhe também o spam.");
    }

    fl.addEventListener("submit", async function (e) {
      e.preventDefault();
      erroLogin.hidden = true;
      var email = valor(fl, "email").toLowerCase();
      var bom = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
      marcar(fl.elements.email, !bom);
      if (!bom) { mostrar(erroLogin, "Digite um e-mail válido."); return; }
      ocupado(btnLogin, true, "Enviando… ", "Receber código ");
      try { await pedirCodigo(email); fCod.reset(); erroCod.hidden = true; etapa("codigo"); }
      catch (r) { mostrar(erroLogin, r && r.status === 429 ? "Muitas tentativas. Aguarde alguns minutos e tente de novo." : "Não conseguimos enviar agora. Tente de novo em instantes ou chame o Bruno no WhatsApp."); }
      finally { ocupado(btnLogin, false, "", "Receber código "); }
    });
    fCod.addEventListener("submit", async function (e) {
      e.preventDefault();
      erroCod.hidden = true;
      var cod = digitos(valor(fCod, "codigo")), btn = $("env-codigo");
      marcar(fCod.elements.codigo, cod.length !== 6);
      if (cod.length !== 6) { mostrar(erroCod, "Digite os 6 números do código."); return; }
      ocupado(btn, true, "Entrando… ", "Entrar ");
      try {
        var r = await enviar("/auth/entrar", { email: emailAtual, codigo: cod });
        if (!r.ok) throw r;
        sessao = r.dados.sessao; guardar("ub-sessao", sessao);
        await escolher(r.dados.clientes || [], "");
      } catch (r) {
        var msg = "Não conseguimos entrar agora. Tente de novo em instantes ou chame o Bruno no WhatsApp.";
        if (r && r.status === 401) msg = "Código inválido ou vencido. Confira os números ou peça outro código.";
        if (r && r.status === 403) msg = "Este e-mail não tem acesso à área do cliente. Chame o Bruno no WhatsApp.";
        if (r && r.status === 429) msg = "Muitas tentativas. Aguarde um minuto e tente de novo.";
        mostrar(erroCod, msg);
      } finally { ocupado(btn, false, "", "Entrar "); }
    });
    $("reenviar").addEventListener("click", async function () {
      var b = this; erroCod.hidden = true; b.disabled = true;
      try { await pedirCodigo(emailAtual); } catch (r) { mostrar(erroCod, "Não conseguimos enviar agora. Aguarde um minuto e tente de novo."); }
      setTimeout(function () { b.disabled = false; }, 20000);
    });
    $("outro-email").addEventListener("click", function () { etapa("email"); });
    $("sair").addEventListener("click", function () {
      if (sessao) enviar("/auth/sair", { sessao: sessao }).catch(function () {});
      guardar("ub-sessao", ""); guardar("ub-cliente", ""); guardar("ub-codigo", "");
      sessao = ""; clienteId = ""; estado = null; sArea.hidden = true; sLogin.hidden = false; fl.reset(); etapa("email");
    });
    // volta sozinho se a sessão ainda vale (30 dias); se não, mostra a entrada
    guardar("ub-codigo", "");
    (async function () {
      var s = ler("ub-sessao"); if (!s) return;
      try {
        sessao = s;
        var r = await enviar("/auth/eu", { sessao: s });
        if (!r.ok) throw r;
        await escolher(r.dados.clientes || [], ler("ub-cliente"));
      } catch (e) { sessao = ""; guardar("ub-sessao", ""); guardar("ub-cliente", ""); }
    })();
    fc.addEventListener("submit", async function (e) {
      e.preventDefault();
      errc.hidden = true; okc.hidden = true;
      var dados = {
        sessao: sessao, cliente: clienteId, tipo: valor(fc, "tipo"), quantidade: parseInt(valor(fc, "quantidade"), 10) || 1, resumo: valor(fc, "resumo"),
        descricao: valor(fc, "descricao"), prazo: valor(fc, "prazo"), link: valor(fc, "link"), empresa_site: valor(fc, "empresa_site")
      };
      var ruim = [];
      if (!dados.tipo) ruim.push("tipo");
      if (dados.resumo.length < 3) ruim.push("resumo");
      ["tipo", "resumo"].forEach(function (n) { marcar(fc.elements[n], ruim.indexOf(n) >= 0); });
      if (ruim.length) { errc.textContent = "Escolha o modelo e escreva um resumo curto do pedido."; errc.hidden = false; return; }
      btc.disabled = true; btc.firstChild.textContent = "Enviando… ";
      try {
        var r = await enviar("/pedido", dados);
        if (!r.ok) throw r;
        okc.textContent = "Pedido enviado. Número: " + (r.dados.protocolo || "") + ". Você acompanha o andamento aqui.";
        okc.hidden = false;
        // o KV pode levar até 1 minuto para listar o pedido novo: mostramos já, sem buscar de novo
        if (estado) {
          estado.pedidos = [{ protocolo: r.dados.protocolo, tipo: dados.tipo, resumo: dados.resumo, quantidade: dados.quantidade,
                              descricao: dados.descricao, prazo: dados.prazo, status: "Recebido", recebidoEm: new Date().toISOString() }].concat(estado.pedidos || []);
        }
        fc.reset(); fc.elements.quantidade.value = 1;
        if (estado) desenhar();
        ir("ped");
      } catch (r) {
        var msg = "Não conseguimos enviar agora. Tente de novo em instantes ou chame o Bruno no WhatsApp.";
        if (r && (r.status === 401 || r.status === 403)) msg = "Sua sessão expirou. Saia e entre de novo com o seu e-mail.";
        if (r && r.status === 429) msg = "Você acabou de enviar um pedido. Aguarde um minuto para enviar outro.";
        errc.textContent = msg; errc.hidden = false;
      } finally {
        btc.disabled = false; btc.firstChild.textContent = "Enviar pedido ";
      }
    });
  }
})();
