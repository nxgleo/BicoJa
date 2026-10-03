export interface Coordenadas {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
}

export async function geocodeEndereco(endereco: string): Promise<Coordenadas | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}&countrycodes=br&limit=1`,
      {
        headers: {
          "User-Agent": "BicoJaApp/1.0 (contato@bicoja.com.br)",
        },
      }
    );

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        formattedAddress: data[0].display_name,
      };
    }

    return null;
  } catch (error) {
    console.error("Erro na geocodificação via Nominatim:", error);
    return null;
  }
}