import Link from "next/link";
import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Image
            className="footer-logo"
            src="/assets/images/smme_footer_logo.png"
            alt=""
            width={86}
            height={87}
          />
          <h3>Schools Division of Baguio City</h3>
          <p>
            Empowering schools through good governance, effective monitoring, and
            evidence-based decision-making.
          </p>
        </div>
        <div>
          <h4>Quick Links</h4>
          <Link href="/about">About Us</Link>
          <Link href="/services">Services & Applications</Link>
          <Link href="/documents">Issuances & Documents</Link>
          <Link href="/news">News & Updates</Link>
          <Link href="/contact">Contact Us</Link>
        </div>
        <div>
          <h4>Useful Links</h4>
          <a href="#">DepEd Philippines</a>
          <a href="#">DepEd Cordillera Administrative Region</a>
          <a href="#">DepEd Orders & Memoranda</a>
          <a href="#">DepEd Directory</a>
          <a href="#">Freedom of Information (FOI)</a>
        </div>
        <div>
          <h4>Contact Us</h4>
          <p>
            DepEd - Cordillera Administrative Region
            <br />
            #82 Military Cut-off Road
            <br />
            Baguio City
          </p>
          <p>
            (074) 442-4326
            <br />
            smme.car@deped.gov.ph
          </p>
          <p>
            Monday - Friday
            <br />
            8:00 AM - 5:00 PM
          </p>
        </div>
      </div>
      <div className="container copyright">
        &copy; 2024 Department of Education - Cordillera Administrative Region. All
        rights reserved.
      </div>
    </footer>
  );
}
