/** Historical credentials and callbacks remain available, but new stores use Wompi. */
export async function GET() {
  return Response.json(
    {
      message:
        'Las compras nuevas usan Wompi. Registra tu cuenta bancaria en el panel del artista.',
    },
    { status: 410 },
  )
}
