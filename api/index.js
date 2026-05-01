export default async function handler(req, res) {
  try {
    // 🆕 Añadimos nerf_langs y nerf_percent a los query parameters
    const { username, theme = "dark", style = "default", nerf_langs, nerf_percent = 50 } = req.query;
    const token = process.env.GH_TOKEN;

    if (!username) {
      return res.status(400).send("Error: Falta ?username=");
    }

    if (!token) {
      return res.status(500).send("Falta GH_TOKEN");
    }

    const cleanToken = token.trim();

    const query = `
      query userInfo($login: String!) {
        user(login: $login) {
          name
          login
          repositories(first: 50, ownerAffiliations: OWNER) {
            totalCount
            nodes {
              stargazers { totalCount }
              languages(first: 5, orderBy: {field: SIZE, direction: DESC}) {
                edges {
                  size
                  node {
                    name
                    color
                  }
                }
              }
            }
          }
          contributionsCollection {
            totalCommitContributions
          }
        }
      }
    `;

    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `bearer ${cleanToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { login: username },
      }),
    });

    const json = await response.json();

    if (!json.data?.user) {
      return res.status(404).send("Usuario no encontrado");
    }

    const data = json.data.user;

    const name = data.name || data.login;
    const totalRepos = data.repositories.totalCount;
    const totalCommits =
      data.contributionsCollection.totalCommitContributions;

    const totalStars = data.repositories.nodes.reduce(
      (acc, r) => acc + r.stargazers.totalCount,
      0
    );

    // 🔥 CALCULAR LENGUAJES
    const languageStats = {};

    data.repositories.nodes.forEach(repo => {
      repo.languages.edges.forEach(lang => {
        if (!languageStats[lang.node.name]) {
          languageStats[lang.node.name] = {
            size: 0,
            color: lang.node.color || "#ccc"
          };
        }
        languageStats[lang.node.name].size += lang.size;
      });
    });

    // =========================================================
    // 🔨 NUEVO SISTEMA DE NERFEO DE LENGUAJES
    // =========================================================
    if (nerf_langs) {
      // Convertimos los lenguajes a minúsculas para evitar errores de mayúsculas/minúsculas
      const langsToNerf = nerf_langs.split(',').map(l => l.trim().toLowerCase());
      // Calculamos el multiplicador. Si piden nerfear 80%, multiplicamos por 0.20
      const percentToKeep = Math.max(0, 100 - Number(nerf_percent));
      const multiplier = percentToKeep / 100;

      Object.keys(languageStats).forEach(lang => {
        if (langsToNerf.includes(lang.toLowerCase())) {
          languageStats[lang].size = Math.floor(languageStats[lang].size * multiplier);
        }
      });
    }

    // Ordenamos después del nerfeo para que los lenguajes nerfeados puedan caer del top 5
    const sortedLanguages = Object.entries(languageStats)
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, 5);

    const totalLanguageSize = sortedLanguages.reduce(
      (acc, [, val]) => acc + val.size,
      0
    );

    // =========================================================
    // 🆕 MODO CARD
    // =========================================================
    if (style === "card") {

      let offset = 0;
      let topBar = "";

      sortedLanguages.forEach(([name, val]) => {
        const percentage = (val.size / totalLanguageSize) * 100;
        const width = (percentage / 100) * 440;

        topBar += `
          <rect x="${30 + offset}" y="90" 
            width="${width}" 
            height="8" 
            fill="${val.color}" />
        `;

        offset += width;
      });

      let languageList = "";
      let yPos = 130;

      sortedLanguages.forEach(([name, val]) => {
        const percentage = ((val.size / totalLanguageSize) * 100).toFixed(1);

        languageList += `
          <circle cx="40" cy="${yPos - 5}" r="4" fill="${val.color}" />
          <text x="55" y="${yPos}" font-size="14" fill="#c9d1d9">${name}</text>
          <text x="450" y="${yPos}" text-anchor="end" font-size="14" fill="#8b949e">
            ${percentage}%
          </text>
        `;

        yPos += 25;
      });

      const height = 150 + sortedLanguages.length * 25;

      const svgCard = `
      <svg width="500" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <style>
          .bg { fill: #0d1117; rx: 12px; stroke: #30363d; stroke-width: 1px; }
          .title { font-family: Arial; font-size: 20px; font-weight: bold; fill: #c9d1d9; }
          .credit { font-family: Arial; font-size: 11px; fill: #6e7681; }
        </style>

        <rect width="100%" height="100%" class="bg" />

        <text x="30" y="50" class="title">
          Lenguajes más usados
        </text>

        ${topBar}

        ${languageList}

        <text x="470" y="${height - 15}" text-anchor="end" class="credit">
          Creado por @EnriqueBDeL
        </text>
      </svg>
      `;

      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Cache-Control", "public, s-maxage=7200");
      return res.status(200).send(svgCard);
    }

    // =========================================================
    // 🆕 MODO HYBRID (Stats + Barra + Lista Compacta)
    // =========================================================
    if (style === "hybrid") {

      const topBarXStart = 30;
      const topBarWidth = 440;
      const topBarY = 165;
      const topBarHeight = 10;

      let offset = 0;
      let topBar = "";

      sortedLanguages.forEach(([name, val]) => {
        const percentage = val.size / totalLanguageSize;
        const width = percentage * topBarWidth;

        topBar += `
          <rect 
            x="${topBarXStart + offset}" 
            y="${topBarY}" 
            width="${width}" 
            height="${topBarHeight}" 
            fill="${val.color}" 
            rx="3"
          />
        `;

        offset += width;
      });

      // ===== Lista compacta mejor alineada =====
      let languageList = "";
      const listYStart = topBarY + 30;
      const listSpacing = 26;
      let yPos = listYStart;

      sortedLanguages.forEach(([name, val]) => {
        const percentage = ((val.size / totalLanguageSize) * 100).toFixed(1);

        languageList += `
          <circle cx="40" cy="${yPos - 4}" r="5" fill="${val.color}" />
          
          <text 
            x="60" 
            y="${yPos}" 
            font-size="14" 
            font-family="Arial" 
            fill="#c9d1d9"
          >
            ${name}
          </text>

          <text 
            x="450" 
            y="${yPos}" 
            text-anchor="end" 
            font-size="14" 
            font-family="Arial" 
            fill="#8b949e"
          >
            ${percentage}%
          </text>
        `;

        yPos += listSpacing;
      });

      const height = yPos + 10;

      const svgHybrid = `
      <svg width="500" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <style>
          .bg { fill: #0d1117; rx: 12px; stroke: #30363d; stroke-width: 1px; }
          .title { font-family: Arial; font-size: 22px; font-weight: bold; fill: #58a6ff; }
          .stat { font-family: Arial; font-size: 20px; font-weight: bold; fill: #c9d1d9; }
          .label { font-family: Arial; font-size: 14px; fill: #8b949e; }
          .section { font-family: Arial; font-size: 15px; fill: #c9d1d9; font-weight: bold; }
          .credit { font-family: Arial; font-size: 11px; fill: #6e7681; }
        </style>

        <rect width="100%" height="100%" class="bg" />

        <!-- Título -->
        <text x="30" y="40" class="title">Estadísticas</text>
        <line x1="30" y1="55" x2="470" y2="55" stroke="#30363d"/>

        <!-- Stats -->
        <text x="30" y="90" class="label">⭐ Estrellas</text>
        <text x="30" y="115" class="stat">${totalStars}</text>

        <text x="190" y="90" class="label">📦 Repos</text>
        <text x="190" y="115" class="stat">${totalRepos}</text>

        <text x="350" y="90" class="label">🚀 Commits</text>
        <text x="350" y="115" class="stat">${totalCommits}</text>

        <!-- Sección lenguajes -->
        <text x="30" y="${topBarY - 12}" class="section">
          Lenguajes más usados
        </text>

        ${topBar}
        ${languageList}

        <!-- Crédito -->
        <text x="470" y="${height - 12}" text-anchor="end" class="credit">
          Creado por @EnriqueBDeL
        </text>

      </svg>
      `;

      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Cache-Control", "public, s-maxage=7200");
      return res.status(200).send(svgHybrid);
    }

    // =========================================================
    // 🎨 MODO ORIGINAL (DEFAULT)
    // =========================================================

    let languageBars = "";
    let y = 170;

    sortedLanguages.forEach(([name, val]) => {
      const percentage = ((val.size / totalLanguageSize) * 100).toFixed(1);
      const barWidth = (percentage / 100) * 440;

      languageBars += `
        <text x="30" y="${y}" font-size="12" fill="#8b949e">${name} ${percentage}%</text>
        <rect x="30" y="${y + 8}" width="${barWidth}" height="8" fill="${val.color}" rx="4"/>
      `;
      y += 30;
    });

    const height = 180 + sortedLanguages.length * 30;

    const svg = `
<svg width="500" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .bg { fill: #0d1117; rx: 12px; stroke: #30363d; stroke-width: 1px; }
    .title { font-family: Arial; font-size: 22px; font-weight: bold; fill: #58a6ff; }
    .stat { font-family: Arial; font-size: 20px; font-weight: bold; fill: #c9d1d9; }
    .label { font-family: Arial; font-size: 14px; fill: #8b949e; }
    .credit { font-family: Arial; font-size: 11px; fill: #6e7681; }
  </style>

  <rect width="100%" height="100%" class="bg" />

  <text x="30" y="40" class="title">Estadísticas</text>
  <line x1="30" y1="55" x2="470" y2="55" stroke="#30363d"/>

  <text x="30" y="90" class="label">⭐ Estrellas</text>
  <text x="30" y="115" class="stat">${totalStars}</text>

  <text x="190" y="90" class="label">📦 Repos</text>
  <text x="190" y="115" class="stat">${totalRepos}</text>

  <text x="350" y="90" class="label">🚀 Commits</text>
  <text x="350" y="115" class="stat">${totalCommits}</text>

  <text x="30" y="150" class="label">Lenguajes más usados</text>

  ${languageBars}

  <text x="470" y="${height - 15}" text-anchor="end" class="credit">
    Creado por @EnriqueBDeL
  </text>
</svg>
`;

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, s-maxage=7200");
    res.status(200).send(svg);

  } catch (error) {
    console.error(error);
    res.status(500).send("Error interno");
  }
}
