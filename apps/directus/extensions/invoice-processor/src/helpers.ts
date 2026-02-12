import type {
  EndpointContext,
  UsersServiceConstructor,
} from "./types";

export async function getTenantFromUser(
  req: Record<string, unknown>,
  context: EndpointContext,
): Promise<string | null> {
  const accountability = req.accountability as
    | { user?: string }
    | undefined;
  if (!accountability?.user) return null;

  const { services, database, getSchema } = context;
  const UsersService = services.UsersService as UsersServiceConstructor;

  const schema = await getSchema();
  const usersService = new UsersService({
    schema,
    knex: database,
  });

  const user = (await usersService.readOne(accountability.user, {
    fields: ["tenant"],
  })) as { tenant?: string };

  return user.tenant ?? null;
}
