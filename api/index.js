export default async function handler(req, res) {
  try {
    const { username } = req.query;
    const token = process.env.GH_TOKEN;

    // 1. Validaciones
    if (!username) return res.status(400).send('Error: Falta el parametro ?username=');
    if (!token) return res.status(500).send('Error: Falta configurar GH_TOKEN en Vercel');

    // Limpiamos el token por si se ha colado basura al copiarlo
    const cleanToken = token.trim();

    // 2. Definimos la consulta a GitHub
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

    // 3. Hacemos la petición
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `bearer ${cleanToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables: { login: username } }),
    });

    // 4. Comprobamos errores de la API
    if (!response.ok) {
        const errorText = await response.text();
        console.error("GitHub API Error:", errorText);
        return res.status(response.status).send(`Error de GitHub (${response.status}): Revisa tu Token.`);
    }

    const json = await response.json();

    if (json.errors || !json.data.user) {
      return res.status(404).send('Usuario no encontrado o Token sin permisos de lectura.');
    }

    // 5. Procesamos los datos
    const data = json.data.user;
    const name = data.name || username;
    const totalRepos = data.repositories.totalCount;
    const totalCommits = data.contributionsCollection.totalCommitContributions;
    const totalStars = data.repositories.nodes.reduce((acc, r) => acc + r.stargazers.totalCount, 0);

    // 6. Generamos el SVG
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
        
        <text x="25" y="100" class="label">Estrellas:</text>
        <text x="25" y="130" class="stat">${totalStars}</text>
        
        <text x="175" y="100" class="label">Commits (año):</text>
        <text x="175" y="130" class="stat">${totalCommits}</text>
        
        <text x="325" y="100" class="label">Repositorios:</text>
        <text x="325" y="130" class="stat">${totalRepos}</text>
      </svg>
    `;

    res.setHeader('Content-Type', 'image/svg+xml');
    // Cache de 2 horas para que cargue rápido
    res.setHeader('Cache-Control', 'public, max-age=7200');
    res.status(200).send(svg);

  } catch (error) {
    console.error(error);
    res.status(500).send('Error interno del servidor');
  }
}
