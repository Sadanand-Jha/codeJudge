import Link from "next/link";

interface UnsolvedAttempt {
  id: string;
  name: string;
  lastSubmissionId: string;
}

const mockUnsolved: UnsolvedAttempt[] = [
  { id: "2250B", name: "Two Divisors", lastSubmissionId: "12345678" },
  { id: "1741C", name: "Minimize the Thickness", lastSubmissionId: "12345679" },
  { id: "1730B", name: "Meeting on the Line", lastSubmissionId: "12345680" },
];

export default function LastUnsolvedWidget() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-[#E6E7EB] text-[#6B7280]">
            <th className="px-1 py-1 text-left font-medium">#</th>
            <th className="px-1 py-1 text-left font-medium">Name</th>
            <th className="px-1 py-1 text-right font-medium">Last submission</th>
          </tr>
        </thead>
        <tbody>
          {mockUnsolved.map((item, idx) => (
            <tr
              key={item.id}
              className={idx % 2 === 0 ? "bg-white" : "bg-[#FAFAFB]"}
            >
              <td className="px-1 py-1">
                <Link
                  href={`/problems/${item.id}`}
                  className="text-[#6A5ACD] hover:text-[#2563EB]"
                >
                  {item.id}
                </Link>
              </td>
              <td className="px-1 py-1">
                <Link
                  href={`/problems/${item.id}`}
                  className="text-[#2563EB] hover:underline"
                >
                  {item.name}
                </Link>
              </td>
              <td className="px-1 py-1 text-right">
                <Link
                  href={`/submissions/${item.lastSubmissionId}`}
                  className="text-[#2563EB] hover:underline"
                >
                  {item.lastSubmissionId}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}