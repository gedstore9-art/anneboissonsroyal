// app/api/chat/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, catalog } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        reply: "Le service IA n'est pas configuré. Veuillez contacter le service client au +229 01 00 00 00."
      }, { status: 200 });
    }

    const systemPrompt = `Tu es le sommelier et assistant commercial virtuel d'élite de "Anne Boissons Royale", entreprise de vente de boissons en détail et en gros située à Cotonou, Bénin.
Devise : Franc CFA (FCFA).
Modalité de paiement : Paiement à la livraison exclusivement (Cash on Delivery).
Zones de livraison :
- Cotonou (1 000 FCFA)
- Abomey-Calavi (1 500 FCFA)
- Porto-Novo (2 000 FCFA)
- Autres villes du Bénin : Expédition sécurisée (3 500 FCFA).
Catalogue actuel : ${JSON.stringify(catalog || [])}

Règles de réponse :
1. Sois poli, concis, professionnel et royal.
2. Rappelle que la vente d'alcool est réservée aux 18 ans et plus.
3. Mets en valeur les tarifs de gros quand le client achète en quantité.
4. Réponds toujours en français chaleureux adapté au public béninois.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nQuestion client: ${message}` }]
            }
          ]
        })
      }
    );

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 
      "Je suis à votre disposition. Que souhaitez-vous commander aujourd'hui ?";

    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      { reply: "Désolé, je rencontre une indisponibilité temporaire. Veuillez consulter notre catalogue directement." },
      { status: 500 }
    );
  }
}