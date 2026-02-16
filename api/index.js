export default async function handler(req, res) {
  // 1. Recogemos el usuario de la URL (?username=pepito)
  const { username } = req.query;

  if (!username) {
    return res.status(400).send('<svg><text>Error: Falta el parametro ?username=</text></svg>');
  }

  // 2. Usamos TU token (que configuraremos en Vercel) para tener permiso
  const token = process.env.GH_TOKEN;

  // 3. Pedimos los datos de ESE usuario a GitHub
  const query = `
    query userInfo($login: String!) {
      user(login: $login) {
        name
        repositories(first: 100, ownerAffiliations: OWNER, orderBy: {direction: DESC, field: STARGAZERS}) {
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

  try {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables: { login: username } }),
    });

    const json = await response.json();

    // Si el usuario no existe
    if (json.errors || !json.data.user) {
      return res.send(`<svg width="400" height="100" xmlns="http://www.w3.org/2000/svg"><text x="10" y="50">Usuario "${username}" no encontrado</text></svg>`);
    }

    const data = json.data.user;

    // 4. Extraemos sus estadisticas
    const name = data.name || username;
    const totalRepos = data.repositories.totalCount;
    const totalCommits = data.contributionsCollection.totalCommitContributions;
    // Sumamos las estrellas de todos sus repos
    const totalStars = data.repositories.nodes.reduce((acc, r) => acc + r.stargazers.totalCount, 0);

    // 5. Dibujamos la tarjeta (SVG)
    const svg = `
      <svg width="450" height="195" viewBox="0 0 450 195" xmlns="http://www.w3.org/2000/svg">
        <style>
          .bg { fill: #0d1117; rx: 10px; stroke: #30363d; stroke-width: 1px; }
          .title { font-family: sans-serif; font-size: 20px; font-weight: 600; fill: #58a6ff; }
          .text { font-family: sans-serif; font-size: 14px; fill: #8b949e; }
          .stat { font-family: sans-serif; font-size: 20px; font-weight: 600; fill: #c9d1d9; }
        </style>
        
        <rect width="100%" height="100%" class="bg" />
        
        <text x="25" y="45" class="title">Stats de ${name}</text>
        <line x1="25" y1="60" x2="425" y2="60" stroke="#30363d" />
        
        <text x="25" y="100" class="text">Estrellas:</text>
        <text x="25" y="130" class="stat">${totalStars}</text>
        
        <text x="175" y="100" class="text">Commits (año):</text>
        <text x="175" y="130" class="stat">${totalCommits}</text>
        
        <text x="325" y="100" class="text">Repos:</text>
        <text x="325" y="130" class="stat">${totalRepos}</text>
      </svg>
    `;

    // 6. Enviamos la imagen
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=1800'); // Cache de 30 min
    res.status(200).send(svg);

  } catch (error) {
    res.status(500).send('Error interno');
  }
}
