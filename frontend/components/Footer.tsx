import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#0b0f19] border-t border-white/5 pt-10 pb-6 mt-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {/* Column 1: Brand */}
          <div className="flex flex-col items-center justify-start">
            <h3 className="font-bold text-white text-base tracking-wide mb-1">
              Talent Intelligence
            </h3>
            <p className="text-xs text-gray-400">
              Secure AI-powered talent graph for enterprise search
            </p>
          </div>

          {/* Column 2: Support & Legal */}
          <div className="flex flex-col items-center justify-start">
            <h3 className="uppercase text-xs font-bold text-white tracking-wider mb-3">
              Support &amp; Legal
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">
                  Contact Support
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Social/Team */}
          <div className="flex flex-col items-center justify-start">
            <h3 className="uppercase text-xs font-bold text-white tracking-wider mb-3">
              Connect
            </h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                >
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
