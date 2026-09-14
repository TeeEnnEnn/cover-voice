import { Router } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { createBlockSchema, getBlocks, createBlock, deleteBlock, updateBlock, updateBlockSchema } from "../crud/block.js";
import { validate } from "../middleware/validate.js";
import { serializeTimestamps } from "../crud/helpers.js";

const router = Router();

router.get("/blocks", requireAuth, async (_req, res) => {
  const userId = res.locals.user!.id;
  const { blocks }  = await getBlocks(userId);
  res.json({blocks: blocks.map(serializeTimestamps)});
});


router.post("/blocks", requireAuth, validate({body: createBlockSchema}), async (req, res) => {
  const userId = res.locals.user!.id;
  const insertedBlock = await createBlock(userId, req.body);
  res.status(201).json(serializeTimestamps(insertedBlock))
});


router.delete("/blocks/:id", requireAuth, async (req, res) => {
  const userId = res.locals.user!.id;
  const blockId = req.params.id as string;
  const updated = await deleteBlock(userId, blockId);
  if (!updated) {
    res.status(404).json({ error: { message: "Block not found", details: [] } })
    return;
  }
  res.status(204).send();
});

router.patch("/blocks/:id", requireAuth, validate({body: updateBlockSchema}), async (req, res) => {
  const userId = res.locals.user!.id;
  const blockId = req.params.id as string;
  const updated = await updateBlock(userId, blockId, req.body);
  if (!updated) {
    res.status(404).json({ error: { message: "Block not found", details: [] } })
    return;
  }
  res.status(200).json(serializeTimestamps(updated));
});

export default router;
