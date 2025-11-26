export async function getGitHubStars(): Promise<number> {
  try {
    const response = await fetch(
      'https://api.github.com/repos/Nexus-JPF/note-companion',
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'note-companion-landing',
        },
        // Cache for 1 hour to avoid hitting rate limits
        next: { revalidate: 3600 }
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch GitHub stars:', response.status);
      // Return fallback value if API fails
      return 530;
    }

    const data = await response.json();
    return data.stargazers_count || 530;
  } catch (error) {
    console.error('Error fetching GitHub stars:', error);
    // Return fallback value if request fails
    return 530;
  }
}