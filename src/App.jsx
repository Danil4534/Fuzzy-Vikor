import React, { useState, useMemo } from "react";

const CRITERIA_TERMS = {
  VL: [0.0, 0.0, 0.1],
  L: [0.0, 0.1, 0.3],
  ML: [0.1, 0.3, 0.5],
  M: [0.3, 0.5, 0.7],
  MH: [0.5, 0.7, 0.9],
  H: [0.7, 0.7, 1.0],
  VH: [0.9, 1.0, 1.0],
};

const ALT_TERMS = {
  VP: [0.0, 0.0, 0.1],
  P: [0.0, 0.1, 0.3],
  MP: [0.1, 0.3, 0.5],
  F: [0.3, 0.5, 0.7],
  MG: [0.5, 0.7, 0.9],
  G: [0.7, 0.7, 1.0],
  VG: [0.9, 1.0, 1.0],
};

const CRITERIA_OPTIONS = Object.keys(CRITERIA_TERMS);
const ALT_OPTIONS = Object.keys(ALT_TERMS);

const addTri = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const subTri = (a, b) => [a[0] - b[2], a[1] - b[1], a[2] - b[0]];
const mulTriScalar = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const divTriScalar = (a, s) =>
  s === 0 || !isFinite(s) || Number.isNaN(s) ? [0, 0, 0] : [a[0] / s, a[1] / s, a[2] / s];
const mulTri = (a, b) => [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
const divTri = (a, b) => [
  safeDiv(a[0], b[2]),
  safeDiv(a[1], b[1]),
  safeDiv(a[2], b[0]),
];
const safeDiv = (x, y) => {
  if (!isFinite(y) || y === 0) return 0;
  return x / y;
};
const defuzz = (tri) => (tri[0] + 2 * tri[1] + tri[2]) / 4;
const triMax = (a, b) => [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])];
const triMin = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])];

export default function App() {
  const [numAlternatives, setNumAlternatives] = useState(4);
  const [numCriteria, setNumCriteria] = useState(5);
  const [numExperts, setNumExperts] = useState(4);

  const [criteriaTypes, setCriteriaTypes] = useState(() =>
    Array.from({ length: numCriteria }).map(() => true)
  );

  const [criteriaWeights, setCriteriaWeights] = useState(() => {
    const arr = [];
    for (let e = 0; e < numExperts; e++) {
      const row = [];
      for (let j = 0; j < numCriteria; j++) row.push("M");
      arr.push(row);
    }
    return arr;
  });

  const [altEvaluations, setAltEvaluations] = useState(() => {
    const arr = [];
    for (let e = 0; e < numExperts; e++) {
      const altBlock = [];
      for (let a = 0; a < numAlternatives; a++) {
        const critRow = [];
        for (let j = 0; j < numCriteria; j++) critRow.push("F");
        altBlock.push(critRow);
      }
      arr.push(altBlock);
    }
    return arr;
  });

  const resizeMatrixes = (na, nc, ne) => {
    setCriteriaWeights((prev) => {
      const res = [];
      for (let e = 0; e < ne; e++) {
        const row = [];
        for (let j = 0; j < nc; j++) row.push((prev[e] && prev[e][j]) || "M");
        res.push(row);
      }
      return res;
    });
    setAltEvaluations((prev) => {
      const res = [];
      for (let e = 0; e < ne; e++) {
        const altBlock = [];
        for (let a = 0; a < na; a++) {
          const critRow = [];
          for (let j = 0; j < nc; j++)
            critRow.push((prev[e] && prev[e][a] && prev[e][a][j]) || "F");
          altBlock.push(critRow);
        }
        res.push(altBlock);
      }
      return res;
    });
    setCriteriaTypes((prev) => {
      const res = [];
      for (let j = 0; j < nc; j++) res.push(prev[j] !== undefined ? prev[j] : true);
      return res;
    });
  };

  const updateCounts = (na, nc, ne) => {
    setNumAlternatives(na);
    setNumCriteria(nc);
    setNumExperts(ne);
    resizeMatrixes(na, nc, ne);
  };

  const handleCriteriaTerm = (eIdx, j, val) => {
    setCriteriaWeights((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      if (!copy[eIdx]) copy[eIdx] = [];
      copy[eIdx][j] = val;
      return copy;
    });
  };

  const handleAltTerm = (eIdx, aIdx, j, val) => {
    setAltEvaluations((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      if (!copy[eIdx]) copy[eIdx] = [];
      if (!copy[eIdx][aIdx]) copy[eIdx][aIdx] = [];
      copy[eIdx][aIdx][j] = val;
      return copy;
    });
  };

  const toggleCriteriaType = (idx) => {
    setCriteriaTypes((prev) => {
      const copy = [...prev];
      copy[idx] = !copy[idx];
      return copy;
    });
  };

  const aggregatedCriteria = useMemo(() => {
    const K = numExperts;
    const result = [];
    for (let j = 0; j < numCriteria; j++) {
      let sum = [0, 0, 0];
      for (let e = 0; e < numExperts; e++) {
        const term =
          criteriaWeights[e] && criteriaWeights[e][j]
            ? criteriaWeights[e][j]
            : "M";
        const tri = CRITERIA_TERMS[term];
        sum = addTri(sum, tri);
      }
      result.push(divTriScalar(sum, K));
    }
    return result;
  }, [criteriaWeights, numCriteria, numExperts]);

  const aggregatedAlts = useMemo(() => {
    const K = numExperts;
    const res = [];
    for (let a = 0; a < numAlternatives; a++) {
      const row = [];
      for (let j = 0; j < numCriteria; j++) {
        let sum = [0, 0, 0];
        for (let e = 0; e < numExperts; e++) {
          const term =
            (altEvaluations[e] &&
              altEvaluations[e][a] &&
              altEvaluations[e][a][j]) ||
            "F";
          const tri = ALT_TERMS[term];
          sum = addTri(sum, tri);
        }
        row.push(divTriScalar(sum, K));
      }
      res.push(row);
    }
    return res;
  }, [altEvaluations, numAlternatives, numCriteria, numExperts]);

  const idealF = useMemo(() => {
    const res = [];
    for (let j = 0; j < numCriteria; j++) {
      let best = criteriaTypes[j]
        ? [-Infinity, -Infinity, -Infinity]
        : [Infinity, Infinity, Infinity];

      for (let a = 0; a < numAlternatives; a++) {
        const tri = aggregatedAlts[a][j] || [0, 0, 0];

        if (criteriaTypes[j]) {
          if (tri[0] > best[0]) best[0] = tri[0];
          if (tri[1] > best[1]) best[1] = tri[1];
          if (tri[2] > best[2]) best[2] = tri[2];
        } else {
          if (tri[0] < best[0]) best[0] = tri[0];
          if (tri[1] < best[1]) best[1] = tri[1];
          if (tri[2] < best[2]) best[2] = tri[2];
        }
      }
      res.push(best);
    }
    return res;
  }, [aggregatedAlts, numAlternatives, numCriteria, criteriaTypes]);

  const antiIdealF = useMemo(() => {
    const res = [];
    for (let j = 0; j < numCriteria; j++) {
      let worst = criteriaTypes[j]
        ? [Infinity, Infinity, Infinity]
        : [-Infinity, -Infinity, -Infinity];

      for (let a = 0; a < numAlternatives; a++) {
        const tri = aggregatedAlts[a][j] || [0, 0, 0];

        if (criteriaTypes[j]) {
          if (tri[0] < worst[0]) worst[0] = tri[0];
          if (tri[1] < worst[1]) worst[1] = tri[1];
          if (tri[2] < worst[2]) worst[2] = tri[2];
        } else {
          if (tri[0] > worst[0]) worst[0] = tri[0];
          if (tri[1] > worst[1]) worst[1] = tri[1];
          if (tri[2] > worst[2]) worst[2] = tri[2];
        }
      }
      res.push(worst);
    }
    return res;
  }, [aggregatedAlts, numAlternatives, numCriteria, criteriaTypes]);

  const normalizedFuzzy = useMemo(() => {
    const res = [];
    for (let a = 0; a < numAlternatives; a++) {
      const row = [];
      for (let j = 0; j < numCriteria; j++) {
        const fStar = idealF[j] || [0, 0, 0];
        const fMinus = antiIdealF[j] || [0, 0, 0];
        const f_ij = aggregatedAlts[a][j] || [0, 0, 0];

        const denom = subTri(fStar, fMinus);
        const numer = subTri(fStar, f_ij);

        let normalized;
        if (criteriaTypes[j]) {
          normalized = divTri(numer, denom);
        } else {
          const numerCost = subTri(f_ij, fStar);
          const denomCost = subTri(fMinus, fStar);
          normalized = divTri(numerCost, denomCost);
        }

        normalized = normalized.map((v) =>
          !isFinite(v) || Number.isNaN(v) ? 0 : Math.max(0, v)
        );
        row.push(normalized);
      }
      res.push(row);
    }
    return res;
  }, [aggregatedAlts, idealF, antiIdealF, criteriaTypes, numAlternatives, numCriteria]);

  const weightedNormalizedFuzzy = useMemo(() => {
    const res = [];
    for (let a = 0; a < numAlternatives; a++) {
      const row = [];
      for (let j = 0; j < numCriteria; j++) {
        const normTri = normalizedFuzzy[a][j] || [0, 0, 0];
        const wTri = aggregatedCriteria[j] || [0, 0, 0];
        const prod = mulTri(normTri, wTri);

        row.push(prod.map((v) => (!isFinite(v) || Number.isNaN(v) ? 0 : v)));
      }
      res.push(row);
    }
    return res;
  }, [normalizedFuzzy, aggregatedCriteria, numAlternatives, numCriteria]);


  const {
    S_fuzzy,
    S_defuzz,
    R_fuzzy,
    R_defuzz
  } = useMemo(() => {
    const S_fuzzy_local = [];
    const S_defuzz_local = [];
    const R_fuzzy_local = [];
    const R_defuzz_local = [];

    for (let a = 0; a < numAlternatives; a++) {
      let sumTri = [0, 0, 0];
      let maxTri = [-Infinity, -Infinity, -Infinity];
      let maxDefuzz = -Infinity;
      for (let j = 0; j < numCriteria; j++) {
        const wnormTri = weightedNormalizedFuzzy[a][j] || [0, 0, 0];
        sumTri = addTri(sumTri, wnormTri);
        maxTri = triMax(maxTri, wnormTri);
        const def = defuzz(wnormTri);
        if (def > maxDefuzz) maxDefuzz = def;
      }
      S_fuzzy_local.push(sumTri);
      S_defuzz_local.push(defuzz(sumTri));
      R_fuzzy_local.push(
        maxTri[0] === -Infinity ? [0, 0, 0] : maxTri
      );
      R_defuzz_local.push(maxDefuzz === -Infinity ? 0 : maxDefuzz);
    }

    return {
      S_fuzzy: S_fuzzy_local,
      S_defuzz: S_defuzz_local,
      R_fuzzy: R_fuzzy_local,
      R_defuzz: R_defuzz_local
    };
  }, [weightedNormalizedFuzzy, numAlternatives, numCriteria]);


  const S_fuzzy_star = useMemo(() => {
    if (!S_fuzzy || S_fuzzy.length === 0) return [0, 0, 0];
    return S_fuzzy.reduce((acc, tri) => triMin(acc, tri), S_fuzzy[0]);
  }, [S_fuzzy]);

  const S_right_max = useMemo(() => {
    if (!S_fuzzy || S_fuzzy.length === 0) return 0;
    return Math.max(...S_fuzzy.map((t) => t[2]));
  }, [S_fuzzy]);

  const S_left_min = useMemo(() => {
    if (!S_fuzzy || S_fuzzy.length === 0) return 0;
    return Math.min(...S_fuzzy.map((t) => t[0]));
  }, [S_fuzzy]);

  const R_fuzzy_star = useMemo(() => {
    if (!R_fuzzy || R_fuzzy.length === 0) return [0, 0, 0];
    return R_fuzzy.reduce((acc, tri) => triMin(acc, tri), R_fuzzy[0]);
  }, [R_fuzzy]);

  const R_right_max = useMemo(() => {
    if (!R_fuzzy || R_fuzzy.length === 0) return 0;
    return Math.max(...R_fuzzy.map((t) => t[2]));
  }, [R_fuzzy]);

  const R_left_min = useMemo(() => {
    if (!R_fuzzy || R_fuzzy.length === 0) return 0;
    return Math.min(...R_fuzzy.map((t) => t[0]));
  }, [R_fuzzy]);

  const S_range_scalar = useMemo(() => {
    const range = S_right_max - S_left_min;
    return !isFinite(range) ? 0 : range;
  }, [S_right_max, S_left_min]);

  const R_range_scalar = useMemo(() => {
    const range = R_right_max - R_left_min;
    return !isFinite(range) ? 0 : range;
  }, [R_right_max, R_left_min]);

  const [vValue, setVvalue] = useState(0.5);


  const { Q_fuzzy, Q_defuzz } = useMemo(() => {
    const Q_fuzzy_local = [];
    const Q_defuzz_local = [];

    for (let a = 0; a < numAlternatives; a++) {
      const S_tri = S_fuzzy[a] || [0, 0, 0];
      const R_tri = R_fuzzy[a] || [0, 0, 0];
      const numerS = subTri(S_tri, S_fuzzy_star);
      const numerR = subTri(R_tri, R_fuzzy_star);
      const fracS = S_range_scalar === 0 ? [0, 0, 0] : divTriScalar(numerS, S_range_scalar);
      const fracR = R_range_scalar === 0 ? [0, 0, 0] : divTriScalar(numerR, R_range_scalar);
      const partS = mulTriScalar(fracS, vValue);
      const partR = mulTriScalar(fracR, 1 - vValue);
      const Qtri = addTri(partS, partR);
      const Qtri_sanit = Qtri.map((x) => (!isFinite(x) || Number.isNaN(x) ? 0 : x));
      Q_fuzzy_local.push(Qtri_sanit);
      Q_defuzz_local.push(defuzz(Qtri_sanit));
    }

    return { Q_fuzzy: Q_fuzzy_local, Q_defuzz: Q_defuzz_local };
  }, [
    S_fuzzy,
    R_fuzzy,
    S_fuzzy_star,
    R_fuzzy_star,
    S_range_scalar,
    R_range_scalar,
    vValue,
    numAlternatives,
  ]);


  const S_star = useMemo(() => (S_defuzz.length ? Math.min(...S_defuzz) : 0), [S_defuzz]);
  const S_minus = useMemo(() => (S_defuzz.length ? Math.max(...S_defuzz) : 0), [S_defuzz]);
  const R_star = useMemo(() => (R_defuzz.length ? Math.min(...R_defuzz) : 0), [R_defuzz]);
  const R_minus = useMemo(() => (R_defuzz.length ? Math.max(...R_defuzz) : 0), [R_defuzz]);

  const ranking = useMemo(() => {
    const arr = Array.from({ length: numAlternatives }).map((_, i) => ({
      idx: i,
      S: S_defuzz[i],
      R: R_defuzz[i],
      Q: Q_defuzz[i],
      Qtri: Q_fuzzy[i],
    }));
    const byQ = [...arr].sort((a, b) => a.Q - b.Q);
    const byS = [...arr].sort((a, b) => a.S - b.S);
    const byR = [...arr].sort((a, b) => a.R - b.R);

    const attachRank = (list, key) => {
      list.forEach((it, i) => {
        it[key + "rank"] = i + 1;
      });
    };
    attachRank(byQ, "Q");
    attachRank(byS, "S");
    attachRank(byR, "R");

    const final = byQ.map((it) => ({
      alt: it.idx,
      Q: it.Q,
      Qtri: it.Qtri,
      Qrank: it.Qrank,
      S: it.S,
      Srank: byS.find(x => x.idx === it.idx).Srank,
      R: it.R,
      Rrank: byR.find(x => x.idx === it.idx).Rrank,
    }));
    return final;
  }, [numAlternatives, S_defuzz, R_defuzz, Q_defuzz, Q_fuzzy]);

  const compromiseCheck = useMemo(() => {
    if (numAlternatives < 2) return { ok: false, bestAlternatives: [] };
    const DQ = 1 / (numAlternatives - 1);
    const sorted = [...ranking].sort((a, b) => a.Q - b.Q);
    const a1 = sorted[0];
    const a2 = sorted[1];
    const advantage = a2.Q - a1.Q;
    const cond1 = advantage >= DQ;
    const cond2 = a1.Srank === 1 || a1.Rrank === 1;

    let bestAlternatives = [];
    if (cond1 && cond2) {
      bestAlternatives = [a1];
    } else {
      const threshold = a1.Q + DQ;
      bestAlternatives = sorted.filter((a) => a.Q <= threshold);
    }

    return {
      DQ,
      advantage,
      cond1,
      cond2,
      ok: bestAlternatives.length > 0,
      bestAlternatives,
    };
  }, [ranking, numAlternatives]);

  const loadSample = () => {
    const sampleCriteria = [
      ["M", "MH", "H", "M", "L"],
      ["MH", "M", "H", "MH", "M"],
      ["M", "M", "H", "M", "L"],
      ["H", "MH", "MH", "M", "M"],
    ];
    const sampleAlts = [];
    for (let e = 0; e < 4; e++) {
      const alts = [];
      alts.push(["F", "MG", "G", "MP", "F"]);
      alts.push(["MG", "G", "G", "MG", "F"]);
      alts.push(["MP", "F", "MG", "MP", "MP"]);
      alts.push(["G", "G", "VG", "G", "MG"]);
      sampleAlts.push(alts);
    }
    setCriteriaWeights(sampleCriteria);
    setAltEvaluations(sampleAlts);
  };

  const renderCriteriaTable = () => {
    return (
      <div className="overflow-auto border p-2 rounded">
        <table className="table-auto border-collapse w-full text-sm">
          <thead>
            <tr>
              <th className="border px-2 py-1">Expert</th>
              {Array.from({ length: numCriteria }).map((_, j) => (
                <th key={j} className="border px-2 py-1">
                  <div>C{j + 1}</div>
                  <div className="text-xs">
                    <label className="mr-2">
                      <input
                        type="checkbox"
                        checked={criteriaTypes[j] ?? true}
                        onChange={() => toggleCriteriaType(j)}
                      />{" "}
                      Benefit
                    </label>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: numExperts }).map((_, e) => (
              <tr key={e}>
                <td className="border px-2 py-1">E{e + 1}</td>
                {Array.from({ length: numCriteria }).map((_, j) => (
                  <td className="border px-2 py-1" key={j}>
                    <select
                      value={
                        (criteriaWeights[e] && criteriaWeights[e][j]) || "M"
                      }
                      onChange={(ev) =>
                        handleCriteriaTerm(e, j, ev.target.value)
                      }
                      className="w-full p-1"
                    >
                      {CRITERIA_OPTIONS.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAltTables = () => {
    return (
      <div className="space-y-4">
        {Array.from({ length: numExperts }).map((_, e) => (
          <div key={e} className="p-2 border rounded">
            <div className="font-semibold mb-2">Expert E{e + 1}</div>
            <div className="overflow-auto">
              <table className="table-auto w-full text-sm">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">Alt</th>
                    {Array.from({ length: numCriteria }).map((_, j) => (
                      <th className="border px-2 py-1" key={j}>
                        C{j + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: numAlternatives }).map((_, a) => (
                    <tr key={a}>
                      <td className="border px-2 py-1">A{a + 1}</td>
                      {Array.from({ length: numCriteria }).map((_, j) => (
                        <td className="border px-2 py-1" key={j}>
                          <select
                            value={
                              (altEvaluations[e] &&
                                altEvaluations[e][a] &&
                                altEvaluations[e][a][j]) ||
                              "F"
                            }
                            onChange={(ev) =>
                              handleAltTerm(e, a, j, ev.target.value)
                            }
                            className="w-full p-1"
                          >
                            {ALT_OPTIONS.map((k) => (
                              <option key={k} value={k}>
                                {k}
                              </option>
                            ))}
                          </select>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 w-full flex justify-center flex-col ">
      <h1 className="text-2xl font-bold mb-4">Fuzzy VIKOR </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="p-4 border rounded">
          <label className="block text-sm">Alternatives</label>
          <input
            type="number"
            min={1}
            value={numAlternatives}
            onChange={(e) =>
              updateCounts(
                Math.max(1, +e.target.value),
                numCriteria,
                numExperts
              )
            }
            className="w-full p-2 mt-1"
          />
        </div>
        <div className="p-4 border rounded">
          <label className="block text-sm mb-1">v : {vValue}</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={vValue}
            onChange={(e) => setVvalue(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="p-4 border rounded">
          <label className="block text-sm">Criteria</label>
          <input
            type="number"
            min={1}
            value={numCriteria}
            onChange={(e) =>
              updateCounts(
                numAlternatives,
                Math.max(1, +e.target.value),
                numExperts
              )
            }
            className="w-full p-2 mt-1"
          />
        </div>
        <div className="p-4 border rounded">
          <label className="block text-sm">Experts</label>
          <input
            type="number"
            min={1}
            value={numExperts}
            onChange={(e) =>
              updateCounts(
                numAlternatives,
                numCriteria,
                Math.max(1, +e.target.value)
              )
            }
            className="w-full p-2 mt-1"
          />
        </div>
      </div>

      <div className="flex gap-2 mb-4 ">
        <button onClick={loadSample} className="px-3 py-2  text-black rounded border">
          Load sample
        </button>
      </div>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">1) Критерії</h2>
        {renderCriteriaTable()}
      </section>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">2) Оцінки експертів</h2>
        {renderAltTables()}
      </section>

      <section className="mb-6">
        <h3 className="font-semibold mb-2">3) Агреговані нечіткі оцінки альтернатив</h3>
        <div className="overflow-auto border p-2 rounded">
          <table className="table-auto w-full text-sm">
            <thead>
              <tr>
                <th className="border px-2 py-1">Alt</th>
                {Array.from({ length: numCriteria }).map((_, j) => (
                  <th className="border px-2 py-1" key={j}>C{j + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: numAlternatives }).map((_, aIdx) => (
                <tr key={aIdx}>
                  <td className="border px-2 py-1 font-medium text-center">A{aIdx + 1}</td>
                  {Array.from({ length: numCriteria }).map((_, cIdx) => {
                    const tri = aggregatedAlts[aIdx][cIdx] || [0, 0, 0];
                    return <td key={cIdx} className="border px-2 py-1 text-center">[{tri.map(x => x.toFixed(3)).join(", ")}]</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="font-semibold mb-2">4) Ідеальні (f*) та антиідеальні (f⁻) значення по критеріях</h3>
        <div className="overflow-auto border p-2 rounded">
          <table className="table-auto w-full text-sm">
            <thead>
              <tr>
                <th className="border px-2 py-1">Критерій</th>
                <th className="border px-2 py-1">Тип</th>
                <th className="border px-2 py-1">f*</th>
                <th className="border px-2 py-1">f⁻</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: numCriteria }).map((_, j) => (
                <tr key={j}>
                  <td className="border px-2 py-1 text-center">C{j + 1}</td>
                  <td className="border px-2 py-1 text-center">{criteriaTypes[j] ? "Benefit" : "Cost"}</td>
                  <td className="border px-2 py-1 text-center">[{(idealF[j] || [0, 0, 0]).map(x => x.toFixed(3)).join(", ")}]</td>
                  <td className="border px-2 py-1 text-center">[{(antiIdealF[j] || [0, 0, 0]).map(x => x.toFixed(3)).join(", ")}]</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="font-semibold mb-2">5) Нормовані нечіткі відхилення (для VIKOR)</h3>
        <div className="overflow-auto border p-2 rounded">
          <table className="table-auto w-full text-sm">
            <thead>
              <tr>
                <th className="border px-2 py-1">Alt</th>
                {Array.from({ length: numCriteria }).map((_, j) => <th key={j} className="border px-2 py-1">C{j + 1}</th>)}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: numAlternatives }).map((_, a) => (
                <tr key={a}>
                  <td className="border px-2 py-1 text-center font-medium">A{a + 1}</td>
                  {Array.from({ length: numCriteria }).map((_, j) => {
                    const tri = normalizedFuzzy[a][j] || [0, 0, 0];
                    return <td key={j} className="border px-2 py-1 text-center">[{tri.map(x => x.toFixed(3)).join(", ")}]</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="font-semibold mb-2">6) Вага * нормалізоване (дефазифіковано) — вклад критеріїв</h3>
        <div className="overflow-auto border p-2 rounded">
          <table className="table-auto w-full text-sm">
            <thead>
              <tr>
                <th className="border px-2 py-1">Alt</th>
                {Array.from({ length: numCriteria }).map((_, j) => <th key={j} className="border px-2 py-1">C{j + 1}</th>)}
                <th className="border px-2 py-1">Sᵢ (defuzz)</th>
                <th className="border px-2 py-1">R̃ᵢ (tri)</th>
                <th className="border px-2 py-1">Rᵢ (defuzz)</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: numAlternatives }).map((_, a) => (
                <tr key={a}>
                  <td className="border px-2 py-1 text-center font-medium">A{a + 1}</td>
                  {Array.from({ length: numCriteria }).map((_, j) => {
                    const tri = weightedNormalizedFuzzy[a][j] || [0, 0, 0];
                    return <td key={j} className="border px-2 py-1 text-center">[{tri.map(x => x.toFixed(3)).join(", ")}] ({defuzz(tri).toFixed(3)})</td>
                  })}
                  <td className="border px-2 py-1 text-center font-medium">{S_defuzz[a].toFixed(4)}</td>
                  <td className="border px-2 py-1 text-center font-medium">[{(R_fuzzy[a] || [0, 0, 0]).map(x => x.toFixed(3)).join(", ")}]</td>
                  <td className="border px-2 py-1 text-center font-medium">{R_defuzz[a].toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="mb-6">
        <h3 className="font-semibold mb-2">7) Результати VIKOR — S, R, Q та ранжування</h3>
        <div className="overflow-auto border p-2 rounded">
          <table className="table-auto w-full text-sm">
            <thead>
              <tr>
                <th className="border px-2 py-1">Альтернатива</th>
                <th className="border px-2 py-1">Sᵢ</th>
                <th className="border px-2 py-1">Rᵢ</th>
                <th className="border px-2 py-1">Q̃ᵢ (tri)</th>
                <th className="border px-2 py-1">Qᵢ (defuzz)</th>
                <th className="border px-2 py-1">Ранг (Q)</th>
                <th className="border px-2 py-1">Ранг (S)</th>
                <th className="border px-2 py-1">Ранг (R)</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r) => (
                <tr key={r.alt}>
                  <td className="border px-2 py-1 text-center font-medium">A{r.alt + 1}</td>
                  <td className="border px-2 py-1 text-center">{r.S.toFixed(4)}</td>
                  <td className="border px-2 py-1 text-center">{r.R.toFixed(4)}</td>
                  <td className="border px-2 py-1 text-center">[{(r.Qtri || [0, 0, 0]).map(x => x.toFixed(4)).join(", ")}]</td>
                  <td className="border px-2 py-1 text-center">{r.Q.toFixed(4)}</td>
                  <td className="border px-2 py-1 text-center">{r.Qrank}</td>
                  <td className="border px-2 py-1 text-center">{r.Srank}</td>
                  <td className="border px-2 py-1 text-center">{r.Rrank}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3">
            <div className="mt-6 space-y-4">
              <div
                className={`p-4 border rounded-xl ${compromiseCheck.cond1
                  ? "  text-green-700"
                  : " text-red-700"
                  }`}
              >
                <div className="font-semibold">
                  Умова 1 (прийнятна перевага):
                </div>
                <div>
                  {compromiseCheck.cond1 ? "✔ Виконується" : "❌ Не виконується"}
                </div>
                <div className="text-sm opacity-70">
                  Q₂ − Q₁ = {compromiseCheck.advantage.toFixed(4)}
                  {"  "} | DQ = {compromiseCheck.DQ.toFixed(4)}
                </div>
              </div>
              <div
                className={`p-4 border rounded-xl ${compromiseCheck.cond2
                  ? " text-green-700"
                  : " text-red-700"
                  }`}
              >
                <div className="font-semibold">
                  Умова 2 (прийнятна стабільність у прийнятті рішень):
                </div>
                <div>
                  {compromiseCheck.cond2 ? "✔ Виконується" : "❌ Не виконується"}
                </div>
                <div className="text-sm opacity-70">
                  Лідер повинен бути першим за S або R
                </div>
              </div>
              {!(compromiseCheck.cond1 && compromiseCheck.cond2) && (
                <div className="p-4  border border-red-700 text-red-700 font-semibold rounded-xl">
                  Одна умова не виконується, пропонується набір компромісних рішень.
                </div>
              )}
            </div>
            {compromiseCheck.bestAlternatives.length > 0 && (
              <div className="mt-2">
                <strong>Найкращі альтернативи:</strong>{" "}
                {ranking
                  .sort((a, b) => a.Q - b.Q)
                  .map((b) => `A${b.alt + 1} (Q=${b.Q.toFixed(4)})`)
                  .join(", ")}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
