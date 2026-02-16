eexport default async function handler(req, res) {
  const { username } = req.query;
  const token = process.env.GH_TOKEN;

  // 1. COMPROBACIÓN DE TOKEN
  if (!token) {
    return res.send(`<svg width="500" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="black"/>
      <text x="10" y="50" fill="red" font-family="monospace">ERROR: No hay GH_TOKEN en Vercel</text>
    </svg>`);
  }

  // Comprobamos si el token tiene formato raro (espacios o saltos de linea)
  const cleanToken = token.trim(); 

  const query = `
    query userInfo($login: String!) {
      user(login: $login) {
        name
        repositories(first: 100, ownerAffiliations: OWNER, orderBy: {direction: DESC, field: STARGAZERS}) {
          totalCount
          nodes { stargazers { totalCount } }
        }
        contributionsCollection { totalCommitContributions }
      }
    }
  `;

  try {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `bearer ${cleanToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables: { login: username || 'EnriqueBDeL' } }),
    });

    // 2. SI GITHUB DEVUELVE ERROR (401, 403, etc)
    if (!response.ok) {
      const errorText = await response.text();
      console.error("GitHub Error:", errorText); // Ver logs en Vercel
      return res.send(`<svg width="600" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#222"/>
        <text x="10" y="30" fill="red" font-family="monospace" font-size="12">GitHub Error: ${response.status}</text>
        <text x="10" y="50" fill="yellow" font-family="monospace" font-size="10">${errorText.substring(0, 60)}...</text>
      </svg>`);
    }

    const json = await response.json();
    
    if (json.errors) {
       return res.send(`<svg width="500" height="100"><text x="10" y="50" fill="red">Error GraphQL: ${json.errors[0].message}</text></svg>`);
    }

    // SI TODO VA BIEN, DIBUJAMOS LA TARJETA NORMAL
    const data = json.data.user;
    const name = data.name || username;
    const totalRepos = data.repositories.totalCount;
    const totalCommits = data.contributionsCollection.totalCommitContributions;
    const totalStars = data.repositories.nodes.reduce((acc, r) => acc + r.stargazers.totalCount, 0);

    const svg = `
      <svg width="450" height="195" viewBox="0 0 450 195" xmlns="http://www.w3.org/2000/svg">
        <style>
          .bg { fill: #0d1117; rx: 10px; stroke: #30363d; stroke-width: 1px; }
          .title { font-family: sans-serif; font-size: 20px; font-weight: 600; fill: #58a6ff; }
          .stat { font-family: sans-serif; font-size: 20px; font-weight: 600; fill: #c9d1d9; }
          .label { font-family: sans-serif; font-size: 14px; fill: #8b949e; }
        </style>
        <rect width="100%" height="100%" class="bg" />
        <text x="25" y="45" class="title">Stats de ${name}</text>
        <line x1="25" y1="60" x2="425" y2="60" stroke="#30363d" />
        <text x="25" y="100" class="label">Stars:</text> <text x="25" y="130" class="stat">${totalStars}</text>
        <text x="175" y="100" class="label">Commits:</text> <text x="175" y="130" class="stat">${totalCommits}</text>
        <text x="325" y="100" class="label">Repos:</text> <text x="325" y="130" class="stat">${totalRepos}</text>
      </svg>
    `;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache'); // Desactivamos caché para pruebas
    res.send(svg);

  } catch (error) {
    res.send(`<svg><text>Error Interno: ${error.message}</text></svg>`);
  }
}
