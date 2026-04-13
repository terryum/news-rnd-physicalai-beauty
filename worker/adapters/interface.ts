import { RawItem, SourceConfig } from "../types";

export interface CrawlerAdapter {
  /** 주어진 소스 설정에 따라 아이템을 수집하여 반환한다. */
  fetchItems(config: SourceConfig): Promise<RawItem[]>;
}
