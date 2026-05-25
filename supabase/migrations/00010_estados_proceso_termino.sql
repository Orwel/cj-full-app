-- Estados de proceso (abierto/archivado) y de término por actuación

ALTER TABLE public.casos
  ADD COLUMN IF NOT EXISTS estado_proceso text NOT NULL DEFAULT 'indeterminado'
    CHECK (estado_proceso IN ('abierto', 'archivado', 'indeterminado'));

ALTER TABLE public.actuaciones
  ADD COLUMN IF NOT EXISTS estado_termino text NOT NULL DEFAULT 'sin_termino'
    CHECK (
      estado_termino IN (
        'sin_termino',
        'vigente',
        'por_vencer',
        'vencido_sin_respuesta',
        'atendido',
        'cerrado_proceso'
      )
    );

CREATE INDEX IF NOT EXISTS casos_estado_proceso_idx ON public.casos (estado_proceso);
CREATE INDEX IF NOT EXISTS actuaciones_estado_termino_idx ON public.actuaciones (estado_termino);

COMMENT ON COLUMN public.casos.estado_proceso IS
  'Derivado de ubicacion API y última actuación; archivado suprime alertas por plazos históricos.';
COMMENT ON COLUMN public.actuaciones.estado_termino IS
  'Derivado de fecha_fin_termino, actuaciones posteriores y estado_proceso del caso.';

-- Aproximación inicial desde ubicacion (recalc TS refinará severidad)
UPDATE public.casos
SET estado_proceso = CASE
  WHEN ubicacion ILIKE '%archivo%' THEN 'archivado'
  WHEN ubicacion IS NULL OR ubicacion ILIKE '%sin ubicacion%' THEN 'indeterminado'
  ELSE 'abierto'
END;
