-- Prisma no expresa índices sobre expresiones: el correo de contacto es único sin distinguir
-- mayúsculas (el inicio de sesión por correo lo resuelve en minúsculas). Si ya hay correos
-- repetidos, esta migración falla y hay que resolverlos a mano antes de aplicarla.
CREATE UNIQUE INDEX "users_contact_email_lower_key" ON "users" (lower("contact_email")) WHERE "contact_email" IS NOT NULL;
