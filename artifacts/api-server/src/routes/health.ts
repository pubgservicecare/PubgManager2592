import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (req, res) => {
  req.log.info(
    {
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    "uptime check"
  );
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

export default router;
