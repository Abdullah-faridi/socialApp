export async function ToggleRelation<
  T extends {
    findUnique: Function;
    delete: Function;
    create: Function;
  },
>(model: T, where: object, data: object) {
  const existing = await model.findUnique({
    where,
  });
  if (existing) {
    await model.delete({ where });
    return { active: false };
  }
  await model.create({ data });
  return { active: true };
}
