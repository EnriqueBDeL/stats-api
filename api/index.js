export default async function handler(req, res) {
  try {
    const { username, theme = "dark" } = req.query;
    const token = process.env.GH_TOKEN;

    // 1️⃣ Validaciones
    if (!username) {
      return res.status(400).send("Error: Falta el parametro ?username=");
    }

    if (!token) {
      return res.status(500).send("Error: Falta configurar GH_TOKEN en Vercel");
    }

    const cleanToken = token.trim();

    // 2️⃣ Query GraphQL mejorada
    const query = `
      query userInfo($login: String!) {
        user(login: $login) {
          name
          login
          avatarUrl
          repositories(first: 100, ownerAffiliations: OWNER) {
            totalCount
            nodes {
              stargazers {
                totalCount
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error("GitHub API Error:", errorText);
      return res.status(response.status).send("Error consultando GitHub");
    }

    const json = await response.json();

    if (json.errors || !json.data?.user) {
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

    // 🎨 Soporte para tema claro/oscuro
    const themes = {
      dark: {
        bg: "#0d1117",
        border: "#30363d",
        title: "#58a6ff",
        text: "#c9d1d9",
        label: "#8b949e",
      },
      light: {
        bg: "#ffffff",
        border: "#e4e2e2",
        title: "#0969da",
        text: "#24292f",
        label: "#57606a",
      },
    };

    const t = themes[theme] || themes.dark;

    // 3️⃣ SVG dinámico profesional
    const svg = `
    <svg width="500" height="210" viewBox="0 0 500 210" xmlns="http://www.w3.org/2000/svg">
      <style>
        .bg { fill: ${t.bg}; rx: 12px; stroke: ${t.border}; stroke-width: 1px; }
        .title { font-family: Arial, sans-serif; font-size: 22px; font-weight: bold; fill: ${t.title}; }
        .stat { font-family: Arial, sans-serif; font-size: 22px; font-weight: bold; fill: ${t.text}; }
        .label { font-family: Arial, sans-serif; font-size: 14px; fill: ${t.label}; }
      </style>
      <rect width="100%" height="100%" class="bg" />
      
      <text x="30" y="45" class="title">${name}</text>
      <line x1="30" y1="60" x2="470" y2="60" stroke="${t.border}" />
      
      <text x="30" y="105" class="label">⭐ Estrellas</text>
      <text x="30" y="135" class="stat">${totalStars}</text>
      
      <text x="190" y="105" class="label">📦 Repos</text>
      <text x="190" y="135" class="stat">${totalRepos}</text>
      
      <text x="350" y="105" class="label">🚀 Commits (año)</text>
      <text x="350" y="135" class="stat">${totalCommits}</text>
    </svg>
    `;

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, s-maxage=7200");
    res.status(200).send(svg);

  } catch (error) {
    console.error(error);
    res.status(500).send("Error interno del servidor");
  }
}
