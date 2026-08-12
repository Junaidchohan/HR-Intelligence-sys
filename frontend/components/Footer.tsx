import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-[#0b0f19] border-t border-white/5 py-12 mt-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {/* Column 1: Brand */}
          <div className="flex flex-col items-center justify-start">
            <Link href="/" className="mb-3">
              <Image
                src="/talentbase-logo.png"
                alt="TalentBase AI"
                width={100}
                height={30}
                className="w-[100px] h-auto object-contain"
              />
            </Link>
            <p className="text-sm text-gray-400">
              Secure AI-powered talent graph for enterprise search
            </p>
          </div>

          {/* Column 2: Support & Legal */}
          <div className="flex flex-col items-center justify-start">
            <h3 className="text-sm font-bold uppercase text-white tracking-wider mb-3">
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
            <h3 className="text-sm font-bold uppercase text-white tracking-wider mb-3">
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
        
        {/* Bottom Bar */}
        <div className="border-t border-white/5 mt-10 pt-6 text-center">
          <p className="text-sm text-gray-500">
            &copy; 2026 TalentBase AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
