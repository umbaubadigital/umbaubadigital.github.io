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

  /* ---------- diagnóstico (janela na página inicial) ---------- */
  var dlg = $("dlg-diag");
  if (dlg) {
    var f = $("f-diag"), okbox = $("ok-diag"), erro = $("erro-diag"), btn = $("env-diag");
    var abrir = function () {
      evento("clique_diagnostico");
      if (typeof dlg.showModal === "function") { dlg.showModal(); }
      else { location.href = wa("Olá, Bruno! Quero pedir o diagnóstico de Instagram e site."); }
    };
    d.querySelectorAll("[data-diag]").forEach(function (b) { b.addEventListener("click", abrir); });
    dlg.querySelectorAll("[data-fechar]").forEach(function (b) { b.addEventListener("click", function () { dlg.close(); }); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });

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
    var codigo = "";
    var sLogin = $("s-login"), sArea = $("s-area");
    var erroLogin = $("erro-login"), btnLogin = $("env-login");
    var fc = $("f-cliente"), errc = $("erro-cliente"), okc = $("ok-cliente"), btc = $("env-cliente");
    var CLASSE = { "Recebido": "st-recebido", "Em produção": "st-producao", "Entregue": "st-entregue" };

    function dataBR(iso) { try { return new Date(iso).toLocaleDateString("pt-BR"); } catch (e) { return ""; } }
    function prazoBR(p) { if (!p) return ""; var x = String(p).split("-"); return x.length === 3 ? x[2] + "/" + x[1] + "/" + x[0] : p; }

    function desenhar(dados) {
      $("nome-cliente").textContent = dados.cliente || "";
      var ul = $("lista-ped"); ul.innerHTML = "";
      $("ped-vazio").hidden = !!(dados.pedidos && dados.pedidos.length);
      (dados.pedidos || []).forEach(function (p) {
        var li = d.createElement("li");
        var topo = d.createElement("div"); topo.className = "ped-topo";
        var t = d.createElement("b"); t.textContent = p.tipo;
        var chip = d.createElement("span"); chip.className = "chip " + (CLASSE[p.status] || "st-recebido"); chip.textContent = p.status || "Recebido";
        topo.appendChild(t); topo.appendChild(chip);
        var desc = d.createElement("p"); desc.className = "ped-desc"; desc.textContent = p.descricao;
        var meta = d.createElement("small"); meta.className = "ped-meta";
        meta.textContent = "Enviado em " + dataBR(p.recebidoEm) + (p.prazo ? " · para " + prazoBR(p.prazo) : "") + " · " + p.protocolo;
        li.appendChild(topo); li.appendChild(desc); li.appendChild(meta);
        ul.appendChild(li);
      });
      var la = $("lista-arq"); la.innerHTML = "";
      $("arq-vazio").hidden = !!(dados.arquivos && dados.arquivos.length);
      (dados.arquivos || []).forEach(function (a) {
        var li = d.createElement("li");
        var link = d.createElement("a"); link.href = a.url; link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = a.nome;
        li.appendChild(link); la.appendChild(li);
      });
    }

    async function entrar(cod, silencioso) {
      erroLogin.hidden = true;
      if (!silencioso) { btnLogin.disabled = true; btnLogin.firstChild.textContent = "Entrando… "; }
      try {
        var r = await enviar("/meu", { codigo: cod });
        if (!r.ok) throw r;
        codigo = cod;
        try { localStorage.setItem("ub-codigo", cod); } catch (e) {}
        desenhar(r.dados);
        sLogin.hidden = true; sArea.hidden = false;
        return true;
      } catch (r) {
        if (!silencioso) {
          var msg = "Não conseguimos entrar agora. Tente de novo em instantes ou chame o Bruno no WhatsApp.";
          if (r && r.status === 403) msg = "Código não reconhecido. Confira o código que a Umbaúba te passou.";
          if (r && r.status === 429) msg = "Muitas tentativas. Aguarde um minuto e tente de novo.";
          erroLogin.textContent = msg; erroLogin.hidden = false;
        } else { try { localStorage.removeItem("ub-codigo"); } catch (e) {} }
        return false;
      } finally {
        btnLogin.disabled = false; btnLogin.firstChild.textContent = "Entrar ";
      }
    }

    fl.addEventListener("submit", function (e) {
      e.preventDefault();
      var cod = valor(fl, "codigo");
      marcar(fl.elements.codigo, !cod);
      if (!cod) { erroLogin.textContent = "Digite o seu código."; erroLogin.hidden = false; return; }
      entrar(cod, false);
    });
    $("sair").addEventListener("click", function () {
      try { localStorage.removeItem("ub-codigo"); } catch (e) {}
      codigo = ""; sArea.hidden = true; sLogin.hidden = false; fl.reset();
    });
    try { var salvo = localStorage.getItem("ub-codigo"); if (salvo) entrar(salvo, true); } catch (e) {}

    fc.addEventListener("submit", async function (e) {
      e.preventDefault();
      errc.hidden = true; okc.hidden = true;
      var dados = {
        codigo: codigo, tipo: valor(fc, "tipo"), descricao: valor(fc, "descricao"),
        prazo: valor(fc, "prazo"), link: valor(fc, "link"), empresa_site: valor(fc, "empresa_site")
      };
      var ruim = [];
      if (!dados.tipo) ruim.push("tipo");
      if (dados.descricao.length < 5) ruim.push("descricao");
      ["tipo", "descricao"].forEach(function (n) { marcar(fc.elements[n], ruim.indexOf(n) >= 0); });
      if (ruim.length) { errc.textContent = "Escolha o tipo de pedido e descreva o que você precisa."; errc.hidden = false; return; }
      btc.disabled = true; btc.firstChild.textContent = "Enviando… ";
      try {
        var r = await enviar("/pedido", dados);
        if (!r.ok) throw r;
        okc.textContent = "Pedido enviado. Número: " + (r.dados.protocolo || "") + ". Ele já aparece na lista acima.";
        okc.hidden = false; fc.reset();
        entrar(codigo, true).then(function () { /* atualiza a lista */ });
      } catch (r) {
        var msg = "Não conseguimos enviar agora. Tente de novo em instantes ou chame o Bruno no WhatsApp.";
        if (r && r.status === 403) msg = "Seu código não foi reconhecido. Saia e entre de novo.";
        if (r && r.status === 429) msg = "Você acabou de enviar um pedido. Aguarde um minuto para enviar outro.";
        errc.textContent = msg; errc.hidden = false;
      } finally {
        btc.disabled = false; btc.firstChild.textContent = "Enviar pedido ";
      }
    });
  }
})();
