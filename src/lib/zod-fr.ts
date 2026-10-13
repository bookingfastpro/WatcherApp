import { z } from "zod";

// Messages de validation par défaut en français (les messages explicites des schémas restent prioritaires).
z.config(z.locales.fr());
