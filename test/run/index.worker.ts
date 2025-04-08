import { Processor } from "@wsys/dispatcher";

new Processor<{}, {}>(self as unknown as Worker);
