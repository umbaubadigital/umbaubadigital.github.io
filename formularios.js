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
  var fc = $("f-cliente");
  if (fc) {
    var okc = $("ok-cliente"), errc = $("erro-cliente"), btc = $("env-cliente");
    try { var salvo = localStorage.getItem("ub-codigo"); if (salvo) fc.elements.codigo.value = salvo; } catch (e) {}
    fc.addEventListener("submit", async function (e) {
      e.preventDefault();
      errc.hidden = true;
      var dados = {
        codigo: valor(fc, "codigo"), quem: valor(fc, "quem"), tipo: valor(fc, "tipo"), descricao: valor(fc, "descricao"),
        prazo: valor(fc, "prazo"), link: valor(fc, "link"), empresa_site: valor(fc, "empresa_site")
      };
      var ruim = [];
      if (!dados.codigo) ruim.push("codigo");
      if (!dados.tipo) ruim.push("tipo");
      if (dados.descricao.length < 5) ruim.push("descricao");
      ["codigo", "tipo", "descricao"].forEach(function (n) { marcar(fc.elements[n], ruim.indexOf(n) >= 0); });
      if (ruim.length) { errc.textContent = "Preencha o código, o tipo de pedido e a descrição."; errc.hidden = false; return; }
      btc.disabled = true; btc.firstChild.textContent = "Enviando… ";
      try {
        var r = await enviar("/pedido", dados);
        if (!r.ok) throw r;
        try { localStorage.setItem("ub-codigo", dados.codigo); } catch (e) {}
        $("prot-cliente").textContent = r.dados.protocolo || "";
        $("nome-cliente").textContent = r.dados.cliente || "";
        fc.hidden = true; okc.hidden = false;
      } catch (r) {
        var msg = "Não conseguimos enviar agora. Tente de novo em instantes ou chame o Bruno no WhatsApp.";
        if (r && r.status === 403) msg = "Código não reconhecido. Confira o código que a Umbaúba te passou.";
        if (r && r.status === 429) msg = "Você acabou de enviar um pedido. Aguarde um minuto para enviar outro.";
        errc.textContent = msg; errc.hidden = false;
        btc.disabled = false; btc.firstChild.textContent = "Enviar pedido ";
      }
    });
  }
})();
