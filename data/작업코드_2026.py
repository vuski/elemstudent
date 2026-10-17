"""2025·2026년 학교 현황을 2008-2024 최종 정리본에 붙여 2008-2026 자료를 만든다.

입력 (모두 이 폴더)
  09_최종정리_2008-2024.tsv          docs/schoolInfo_2024.tsv 사본 (2024년 업데이트 결과)
  10_2025년도_학교 현황(초).csv       학교알리미
  11_2026년도_학교 현황(초).csv       학교알리미
  12_2026년도_학교기본정보(초).csv    학교알리미 (신설 학교의 주소·좌표)
  13_신설학교_좌표보정.tsv           기본정보에 좌표가 없는 학교를 네이버 지오코딩으로 채운 값

출력
  14_분류결과_2025-2026.tsv          신설 / 재개교 / 폐교(휴교 포함) 학교 목록
  15_최종정리_2008-2026.tsv          최종본
  ../docs/schoolInfo_2026.tsv        웹페이지용 (15번과 동일)

처리 규칙 (2024년 업데이트 방식을 따름)
  - 학교 코드(정보공시 학교코드)로 붙인다. 학급수·학생수는 "30(1)"에서 괄호 앞 숫자만 쓴다.
  - 해당 연도 현황에 없거나 자료가 없는 학교는 그 연도 값을 0으로 둔다.
  - 기존 학교의 이름·주소·좌표·시도·시군구는 바꾸지 않는다.
  - 재건축으로 쉬었다가 같은 자리에서 다시 연 학교는 기존 폐교 행(id=NONE)에 코드를 붙여 기록을 잇는다.
  - 그 밖의 새 코드는 신설 학교로 추가하고 2008-2024년 값은 0으로 둔다.
    시도·시군구는 기존 표기(시도 약칭, 시 단위)로 맞춘다.

실행: python data\\작업코드_2026.py
"""

from pathlib import Path

import pandas as pd

D = Path(__file__).resolve().parent
DOCS = D.parent / "docs"

OLD_YEARS = list(range(2008, 2025))
NEW_YEARS = [2025, 2026]
ALL_YEARS = OLD_YEARS + NEW_YEARS
STATUS_FILES = {
    2025: "10_2025년도_학교 현황(초).csv",
    2026: "11_2026년도_학교 현황(초).csv",
}

# 재건축으로 2018년부터 쉬었다가 같은 자리(10m 이내)에서 다시 연 학교. 설립일도 기존 그대로다.
# (대저중앙초·울산효문초는 2025년에 다른 자리에 새로 세운 학교라서 신설로 처리한다.)
REOPENED = {
    ("서울", "강동구", "서울둔촌초등학교"): "S010000912",
    ("서울", "강동구", "서울위례초등학교"): "S010000940",
}

SIDO_ABBR = {
    "서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구", "인천광역시": "인천",
    "광주광역시": "광주", "대전광역시": "대전", "울산광역시": "울산", "세종특별자치시": "세종",
    "경기도": "경기", "강원도": "강원", "강원특별자치도": "강원", "충청북도": "충북",
    "충청남도": "충남", "전라북도": "전북", "전북특별자치도": "전북", "전라남도": "전남",
    "경상북도": "경북", "경상남도": "경남", "제주특별자치도": "제주",
}
GWANGJU_GU = {"동구", "서구", "남구", "북구", "광산구"}
# 2026년 인천 행정구역 개편으로 생긴 구를 기존 구로 되돌린다.
INCHEON_GU = {"영종구": "중구", "검단구": "서구"}


def to_int(s: pd.Series) -> pd.Series:
    """"30(1)" -> 30, 빈 값 -> 0"""
    return pd.to_numeric(s.str.extract(r"^\s*(\d+)")[0], errors="coerce").fillna(0).astype(int)


def read_status(year: int) -> pd.DataFrame:
    df = pd.read_csv(D / STATUS_FILES[year], dtype=str, encoding="utf-8-sig")
    out = pd.DataFrame({
        "id": df["정보공시 학교코드"],
        "name": df["학교명"],
        "region": df["지역"],
        f"class_{year}": to_int(df["학급수(계)"].fillna("")),
        f"student_{year}": to_int(df["학생수(계)"].fillna("")),
    })
    assert not out["id"].duplicated().any(), f"{year}: 학교코드 중복"
    return out


def to_sido_gu(region: str) -> tuple[str, str]:
    tokens = region.split()
    sido_full = tokens[0]
    gu = tokens[1] if len(tokens) > 1 else ""
    if sido_full == "전남광주통합특별시":
        sido = "광주" if gu in GWANGJU_GU else "전남"
    else:
        sido = SIDO_ABBR[sido_full]
    if sido == "세종":
        gu = "세종시"
    if sido == "인천":
        gu = INCHEON_GU.get(gu, gu)
    return sido, gu


def main() -> None:
    base = pd.read_csv(D / "09_최종정리_2008-2024.tsv", sep="\t", dtype=str, encoding="utf-8-sig")
    n_base = len(base)
    status = {y: read_status(y) for y in NEW_YEARS}

    # 1. 재개교 학교: 폐교 행에 새 코드를 붙인다.
    for (sido, gu, name), new_id in REOPENED.items():
        mask = (base["id"] == "NONE") & (base["sido"] == sido) & (base["gu"] == gu) & (base["name"] == name)
        assert mask.sum() == 1, f"재개교 대상을 찾지 못함: {name}"
        base.loc[mask, "id"] = new_id

    known_ids = set(base.loc[base["id"] != "NONE", "id"])
    assert len(known_ids) == (base["id"] != "NONE").sum(), "기존 자료에 학교코드 중복"

    # 2. 신설 학교 행을 만든다.
    info = pd.read_csv(D / "12_2026년도_학교기본정보(초).csv", dtype=str, encoding="utf-8-sig")
    info = info.set_index("정보공시 학교코드")
    geo = pd.read_csv(D / "13_신설학교_좌표보정.tsv", sep="\t", dtype=str).set_index("id")

    latest = pd.concat([status[2026], status[2025]]).drop_duplicates("id")  # 2026년 이름·지역 우선
    new_rows = []
    for _, r in latest[~latest["id"].isin(known_ids)].iterrows():
        sid = r["id"]
        meta = info.loc[sid]
        # 지역이 비어 있는 학교(예: 인천신검단초)는 도로명 주소의 앞 두 단어를 쓴다.
        region = next(v for v in (r["region"], meta["지역"], meta["학교도로명 주소"]) if isinstance(v, str))
        sido, gu = to_sido_gu(region)
        if sid in geo.index:
            y, x = geo.loc[sid, "y"], geo.loc[sid, "x"]
        else:
            y, x = meta["위도"], meta["경도"]
        assert isinstance(x, str) and isinstance(y, str), f"좌표 없음: {sid} {r['name']}"
        row = {"id": sid, "name": r["name"], "sido": sido, "gu": gu,
               "addr": meta["학교도로명 주소"], "x": f"{float(x):.7f}", "y": f"{float(y):.7f}"}
        for yr in OLD_YEARS:
            row[f"class_{yr}"] = "0"
            row[f"student_{yr}"] = "0"
        new_rows.append(row)
    new_df = pd.DataFrame(new_rows).sort_values(["sido", "gu", "name"])

    # 신설 학교의 시도·시군구가 기존 표기 체계에 있는지 확인한다.
    existing_gu = set(zip(base["sido"], base["gu"]))
    unknown = new_df[[(s, g) not in existing_gu for s, g in zip(new_df["sido"], new_df["gu"])]]
    assert unknown.empty, f"기존에 없는 시도·시군구:\n{unknown[['id', 'name', 'sido', 'gu']]}"

    merged = pd.concat([base, new_df], ignore_index=True)

    # 3. 2025·2026년 값을 붙인다.
    for yr in NEW_YEARS:
        s = status[yr][["id", f"class_{yr}", f"student_{yr}"]]
        merged = merged.merge(s, on="id", how="left")
        for c in (f"class_{yr}", f"student_{yr}"):
            merged[c] = merged[c].fillna(0).astype(int).astype(str)

    cols = (["id", "name", "sido", "gu", "addr", "x", "y"]
            + [f"class_{y}" for y in ALL_YEARS] + [f"student_{y}" for y in ALL_YEARS])
    merged = merged[cols]

    # 4. 검증
    assert len(merged) == n_base + len(new_df)
    assert not merged.isna().any().any(), "빈 값이 있음"
    lon, lat = merged["x"].astype(float), merged["y"].astype(float)
    assert lon.between(124, 132).all() and lat.between(33, 39).all(), "좌표가 한국 범위를 벗어남"
    for yr in NEW_YEARS:
        missing = set(status[yr]["id"]) - set(merged["id"])
        assert not missing, f"{yr}: 결과에 빠진 학교 {missing}"
        assert merged[f"student_{yr}"].astype(int).sum() == status[yr][f"student_{yr}"].sum(), f"{yr}: 학생 수 합계 불일치"

    # 5. 분류 결과
    s24, s25, s26 = (merged[f"student_{y}"].astype(int) for y in (2024, 2025, 2026))
    kind = pd.Series("", index=merged.index)
    kind[merged["id"].isin(new_df["id"])] = "신설"
    kind[merged["id"].isin(REOPENED.values())] = "재개교(기록 연결)"
    kind[(kind == "") & (s24 > 0) & (s25 == 0)] = "2025년 폐교·휴교"
    kind[(kind == "") & (s25 > 0) & (s26 == 0)] = "2026년 폐교·휴교"
    report = merged.loc[kind != "", ["id", "name", "sido", "gu", "addr"]].assign(
        type=kind[kind != ""], student_2024=s24, student_2025=s25, student_2026=s26)
    report = report.sort_values(["type", "sido", "gu", "name"])
    report.to_csv(D / "14_분류결과_2025-2026.tsv", sep="\t", index=False, lineterminator="\r\n")

    # 6. 저장 (기존 schoolInfo_2024.tsv와 같은 형식: UTF-8, BOM 없음, CRLF)
    for path in (D / "15_최종정리_2008-2026.tsv", DOCS / "schoolInfo_2026.tsv"):
        merged.to_csv(path, sep="\t", index=False, lineterminator="\r\n", encoding="utf-8")

    print(f"기존 {n_base}개 + 신설 {len(new_df)}개 = {len(merged)}개")
    print(report["type"].value_counts().to_string())
    print(f"2026년 최대 학생 수: {s26.max()}")


if __name__ == "__main__":
    main()
